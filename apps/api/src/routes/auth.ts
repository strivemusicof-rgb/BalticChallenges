import { hash, verify } from '@node-rs/argon2';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { verifyAppleIdToken, verifyGoogleIdToken, type VerifiedIdentity } from '../auth/oidc.js';
import { withTransaction, type DbClient } from '../db.js';
import { conflict, forbidden, unauthorized } from '../errors.js';
import { parse, type RoutePlugin } from '../http.js';
import { loadMe } from '../services/users.js';

const ARGON_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
// Verified against when the email is unknown so response timing doesn't reveal which emails exist.
const DUMMY_HASH = await hash('baltic-challenges-timing-guard', ARGON_OPTIONS);

const DisplayName = z.string().trim().min(1).max(40);
const Email = z.email().max(254).transform((value) => value.toLowerCase());

const RegisterBody = z.object({
  email: Email,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  displayName: DisplayName,
});
const LoginBody = z.object({ email: Email, password: z.string().min(1).max(128) });
const AppleBody = z.object({
  identityToken: z.string().min(1),
  // Apple only sends the name on the very first authorization, so the client forwards it.
  fullName: z.string().trim().max(80).optional(),
});
const GoogleBody = z.object({ idToken: z.string().min(1) });
const RefreshBody = z.object({ refreshToken: z.string().min(1) });

export const authRoutes: RoutePlugin = (app, { db, tokens, config }) => {
  const authRateLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

  async function respondWithSession(client: DbClient, userId: string, request: FastifyRequest) {
    const me = await loadMe(client, userId);
    const session = await tokens.issueTokens(client, { userId, role: me.role }, request.headers['user-agent']);
    return { user: me, tokens: session };
  }

  async function ensureNotBanned(client: DbClient, userId: string) {
    const { rows } = await client.query<{ banned_at: Date | null }>('SELECT banned_at FROM users WHERE id = $1', [
      userId,
    ]);
    if (rows[0]?.banned_at) throw forbidden('This account has been suspended');
  }

  app.post('/v1/auth/register', authRateLimit, async (request, reply) => {
    const body = parse(RegisterBody, request.body);
    const passwordHash = await hash(body.password, ARGON_OPTIONS);
    const result = await withTransaction(db, async (client) => {
      const existing = await client.query('SELECT 1 FROM users WHERE email = $1', [body.email]);
      if (existing.rowCount) throw conflict('email_taken', 'An account with this email already exists');
      const { rows } = await client.query<{ id: string }>(
        'INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id',
        [body.email, body.displayName],
      );
      const userId = rows[0]!.id;
      await client.query(
        `INSERT INTO auth_identities (user_id, provider, provider_subject, password_hash) VALUES ($1, 'email', $2, $3)`,
        [userId, body.email, passwordHash],
      );
      return respondWithSession(client, userId, request);
    });
    return reply.code(201).send(result);
  });

  app.post('/v1/auth/login', authRateLimit, async (request) => {
    const body = parse(LoginBody, request.body);
    const { rows } = await db.query<{ user_id: string; password_hash: string }>(
      `SELECT user_id, password_hash FROM auth_identities WHERE provider = 'email' AND provider_subject = $1`,
      [body.email],
    );
    const identity = rows[0];
    const valid = await verify(identity?.password_hash ?? DUMMY_HASH, body.password);
    if (!identity || !valid) throw unauthorized('Email or password is incorrect');
    return withTransaction(db, async (client) => {
      await ensureNotBanned(client, identity.user_id);
      return respondWithSession(client, identity.user_id, request);
    });
  });

  async function socialSignIn(
    provider: 'apple' | 'google',
    identity: VerifiedIdentity,
    fallbackName: string | null,
    request: FastifyRequest,
  ) {
    return withTransaction(db, async (client) => {
      const existing = await client.query<{ user_id: string }>(
        'SELECT user_id FROM auth_identities WHERE provider = $1 AND provider_subject = $2',
        [provider, identity.subject],
      );
      let userId = existing.rows[0]?.user_id;
      if (!userId) {
        // Never auto-link to an existing account by email: email sign-ups aren't verified yet,
        // so linking would let anyone with a matching social email take that account over.
        const email = identity.email && identity.emailVerified ? identity.email.toLowerCase() : null;
        const emailFree =
          email !== null && (await client.query('SELECT 1 FROM users WHERE email = $1', [email])).rowCount === 0;
        const displayName = (identity.name ?? fallbackName ?? email?.split('@')[0] ?? 'Explorer').slice(0, 40);
        const { rows } = await client.query<{ id: string }>(
          'INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING id',
          [emailFree ? email : null, displayName],
        );
        userId = rows[0]!.id;
        await client.query('INSERT INTO auth_identities (user_id, provider, provider_subject) VALUES ($1, $2, $3)', [
          userId,
          provider,
          identity.subject,
        ]);
      }
      await ensureNotBanned(client, userId);
      return respondWithSession(client, userId, request);
    });
  }

  app.post('/v1/auth/apple', authRateLimit, async (request) => {
    const body = parse(AppleBody, request.body);
    const identity = await verifyAppleIdToken(body.identityToken, config.APPLE_CLIENT_IDS);
    return socialSignIn('apple', identity, body.fullName ?? null, request);
  });

  app.post('/v1/auth/google', authRateLimit, async (request) => {
    const body = parse(GoogleBody, request.body);
    const identity = await verifyGoogleIdToken(body.idToken, config.GOOGLE_CLIENT_IDS);
    return socialSignIn('google', identity, null, request);
  });

  app.post('/v1/auth/refresh', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request) => {
    const body = parse(RefreshBody, request.body);
    const result = await withTransaction(db, (client) =>
      tokens.rotate(client, body.refreshToken, request.headers['user-agent']),
    );
    if (!result.ok) throw unauthorized(result.message);
    return { tokens: result.tokens };
  });

  app.post('/v1/auth/logout', async (request, reply) => {
    const body = parse(RefreshBody, request.body);
    await tokens.revoke(db, body.refreshToken);
    return reply.code(204).send();
  });
};
