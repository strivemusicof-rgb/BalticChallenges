import { createHash, randomBytes } from 'node:crypto';

import { SignJWT, jwtVerify } from 'jose';

import type { DbClient } from '../db.js';
import { unauthorized } from '../errors.js';

const ACCESS_TOKEN_TTL_S = 60 * 60;
const REFRESH_TOKEN_TTL_DAYS = 60;
const ISSUER = 'baltic-challenges';

export interface AccessClaims {
  userId: string;
  role: 'user' | 'moderator' | 'admin';
}

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

export type RotateResult = { ok: true; tokens: TokenPair } | { ok: false; message: string };

export function createTokenService(secret: string) {
  const key = new TextEncoder().encode(secret);

  async function signAccessToken(claims: AccessClaims): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_S * 1000);
    const token = await new SignJWT({ role: claims.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(claims.userId)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(key);
    return { token, expiresAt };
  }

  async function verifyAccessToken(token: string): Promise<AccessClaims> {
    try {
      const { payload } = await jwtVerify(token, key, { issuer: ISSUER, algorithms: ['HS256'] });
      const role = payload.role;
      if (!payload.sub || (role !== 'user' && role !== 'moderator' && role !== 'admin')) throw new Error('claims');
      return { userId: payload.sub, role };
    } catch {
      throw unauthorized('Invalid or expired access token');
    }
  }

  async function issueTokens(db: DbClient, claims: AccessClaims, userAgent?: string): Promise<TokenPair> {
    const refreshToken = randomBytes(32).toString('base64url');
    await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent)
       VALUES ($1, $2, now() + make_interval(days => $3), $4)`,
      [claims.userId, hashToken(refreshToken), REFRESH_TOKEN_TTL_DAYS, userAgent?.slice(0, 200) ?? null],
    );
    const access = await signAccessToken(claims);
    return { accessToken: access.token, accessTokenExpiresAt: access.expiresAt.toISOString(), refreshToken };
  }

  /**
   * Rotates the refresh token. Presenting an already-rotated token revokes every session of that user.
   * Failures are returned rather than thrown so the caller's transaction still commits the revocation.
   */
  async function rotate(db: DbClient, refreshToken: string, userAgent?: string): Promise<RotateResult> {
    const { rows } = await db.query<{
      id: string;
      user_id: string;
      revoked_at: Date | null;
      expires_at: Date;
      role: AccessClaims['role'];
      banned_at: Date | null;
    }>(
      `SELECT rt.id, rt.user_id, rt.revoked_at, rt.expires_at, u.role, u.banned_at
       FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1
       FOR UPDATE OF rt`,
      [hashToken(refreshToken)],
    );
    const row = rows[0];
    if (!row) return { ok: false, message: 'Invalid refresh token' };
    if (row.revoked_at) {
      await revokeAllForUser(db, row.user_id);
      return { ok: false, message: 'Refresh token reuse detected; please sign in again' };
    }
    if (row.expires_at.getTime() < Date.now() || row.banned_at) return { ok: false, message: 'Session expired' };

    const pair = await issueTokens(db, { userId: row.user_id, role: row.role }, userAgent);
    await db.query(
      `UPDATE refresh_tokens SET revoked_at = now(),
         replaced_by = (SELECT id FROM refresh_tokens WHERE token_hash = $2)
       WHERE id = $1`,
      [row.id, hashToken(pair.refreshToken)],
    );
    return { ok: true, tokens: pair };
  }

  async function revoke(db: DbClient, refreshToken: string): Promise<void> {
    await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [
      hashToken(refreshToken),
    ]);
  }

  async function revokeAllForUser(db: DbClient, userId: string): Promise<void> {
    await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
  }

  return { verifyAccessToken, issueTokens, rotate, revoke, revokeAllForUser };
}

export type TokenService = ReturnType<typeof createTokenService>;

function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}
