import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError } from 'fastify';

import { createAuthHooks } from './auth/plugin.js';
import { createTokenService } from './auth/tokens.js';
import type { Config } from './config.js';
import type { Db } from './db.js';
import { ApiError } from './errors.js';
import type { Deps } from './http.js';
import { adminRoutes } from './routes/admin.js';
import { authRoutes } from './routes/auth.js';
import { challengeRoutes } from './routes/challenges.js';
import { collectionRoutes } from './routes/collections.js';
import { homeRoutes } from './routes/home.js';
import { legalRoutes } from './routes/legal.js';
import { meRoutes } from './routes/me.js';
import { metaRoutes } from './routes/meta.js';
import { postRoutes } from './routes/posts.js';
import { socialRoutes } from './routes/social.js';
import { registerLanguage } from './i18n.js';
import { createPhotoStore } from './services/photos.js';
import { createPushService } from './services/push.js';

export async function buildApp(config: Config, db: Db) {
  const app = Fastify({
    trustProxy: '127.0.0.1',
    bodyLimit: 1024 * 1024,
    logger:
      config.NODE_ENV === 'development'
        ? { level: 'info', transport: { target: 'pino-pretty' } }
        : { level: config.NODE_ENV === 'test' ? 'silent' : 'info', redact: ['req.headers.authorization'] },
  });

  app.decorateRequest('auth', null);
  registerLanguage(app);

  await app.register(rateLimit, { global: true, max: 300, timeWindow: '1 minute' });
  await app.register(multipart);

  app.setErrorHandler((error: FastifyError | ApiError, request, reply) => {
    if (error instanceof ApiError) {
      return reply
        .code(error.statusCode)
        .send({ error: { code: error.code, message: error.message, details: error.details } });
    }
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'unhandled error');
      return reply.code(500).send({ error: { code: 'internal', message: 'Something went wrong' } });
    }
    return reply
      .code(statusCode)
      .send({ error: { code: error.code ?? 'request_error', message: error.message } });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ error: { code: 'not_found', message: 'Route not found' } }),
  );

  const tokens = createTokenService(config.JWT_SECRET);
  const deps: Deps = {
    config,
    db,
    tokens,
    auth: createAuthHooks(tokens),
    photos: createPhotoStore(config),
    push: createPushService(config, db, app.log),
  };

  for (const routes of [
    metaRoutes,
    legalRoutes,
    authRoutes,
    meRoutes,
    homeRoutes,
    challengeRoutes,
    collectionRoutes,
    socialRoutes,
    postRoutes,
    adminRoutes,
  ]) {
    await app.register(async (scope) => routes(scope, deps));
  }

  return app;
}
