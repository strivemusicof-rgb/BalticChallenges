import type { RoutePlugin } from '../http.js';
import { getLevels } from '../services/progression.js';

export const metaRoutes: RoutePlugin = (app, { db }) => {
  app.get('/health', { config: { rateLimit: false } }, async () => {
    await db.query('SELECT 1');
    return { status: 'ok', time: new Date().toISOString() };
  });

  app.get('/v1/levels', async () => ({ levels: await getLevels(db) }));
};
