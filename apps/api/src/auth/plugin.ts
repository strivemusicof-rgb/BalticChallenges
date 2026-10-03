import type { FastifyReply, FastifyRequest } from 'fastify';

import { forbidden, unauthorized } from '../errors.js';
import type { AccessClaims, TokenService } from './tokens.js';

declare module 'fastify' {
  interface FastifyRequest {
    auth: AccessClaims | null;
  }
}

function bearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

export function createAuthHooks(tokens: TokenService) {
  /** Populates request.auth when a valid token is present; never rejects. */
  async function optionalAuth(request: FastifyRequest) {
    const token = bearerToken(request);
    request.auth = token ? await tokens.verifyAccessToken(token).catch(() => null) : null;
  }

  async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
    const token = bearerToken(request);
    if (!token) throw unauthorized();
    request.auth = await tokens.verifyAccessToken(token);
  }

  function requireRole(...roles: AccessClaims['role'][]) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      await requireAuth(request, reply);
      if (!roles.includes(request.auth!.role)) throw forbidden();
    };
  }

  return { optionalAuth, requireAuth, requireRole };
}

export type AuthHooks = ReturnType<typeof createAuthHooks>;

export function userId(request: FastifyRequest): string {
  if (!request.auth) throw unauthorized();
  return request.auth.userId;
}
