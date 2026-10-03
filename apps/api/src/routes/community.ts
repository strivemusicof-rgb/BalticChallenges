import { userId } from '../auth/plugin.js';
import type { RoutePlugin } from '../http.js';
import { communityGoalView, liveCommunityGoals } from '../services/community.js';

/** Shared goals of the running seasonal events (progress bar on Home and the event page). */
export const communityRoutes: RoutePlugin = (app, { db, auth }) => {
  app.get('/v1/community', { preHandler: auth.requireAuth }, async (request) => {
    const rows = await liveCommunityGoals(db, userId(request));
    return { goals: rows.map(communityGoalView) };
  });
};
