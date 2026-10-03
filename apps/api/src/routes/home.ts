import { z } from 'zod';

import { userId } from '../auth/plugin.js';
import { Coordinates, parse, type RoutePlugin } from '../http.js';
import { findChallenges, type ChallengeSummary } from '../services/challenges.js';
import { DAILY_BONUS_XP } from '../services/completion.js';
import { loadGoalProgress } from '../services/goals.js';
import { loadMe } from '../services/users.js';

const NEARBY_RADIUS_KM = 20;

// Onboarding interests mapped to the categories they should boost.
const INTEREST_CATEGORIES: Record<string, string[]> = {
  nature: ['nature'],
  history: ['history'],
  food: ['food'],
  hiking: ['hiking', 'nature-trails', 'long-routes'],
  architecture: ['architecture', 'old-towns', 'castles', 'manors', 'churches'],
  beaches: ['beaches', 'coast'],
  family: ['family'],
  adventure: ['adventure'],
  photography: ['photography', 'viewpoints'],
  wildlife: ['wildlife', 'bogs', 'national-parks'],
  cycling: ['cycling'],
  'road-trips': ['cities', 'old-towns', 'castles'],
};

const DIFFICULTY_ORDER = ['casual', 'explorer', 'adventurer', 'extreme'];

const HomeQuery = z.object({ lat: Coordinates.lat.optional(), lng: Coordinates.lng.optional() });

export const homeRoutes: RoutePlugin = (app, { db, auth }) => {
  app.get('/v1/home', { preHandler: auth.requireAuth }, async (request) => {
    const query = parse(HomeQuery, request.query);
    const uid = userId(request);
    const me = await loadMe(db, uid);
    const point = query.lat !== undefined && query.lng !== undefined ? { lat: query.lat, lng: query.lng } : {};

    const [daily, nearby, inProgress, candidates, categories, goals] = await Promise.all([
      findChallenges(db, { userId: uid, ...point, countries: me.countries, status: 'uncompleted', sort: 'daily', limit: 1 }),
      'lat' in point
        ? findChallenges(db, { userId: uid, ...point, radiusKm: NEARBY_RADIUS_KM, status: 'uncompleted', sort: 'distance', limit: 10 })
        : Promise.resolve([] as ChallengeSummary[]),
      findChallenges(db, { userId: uid, ...point, status: 'in_progress', limit: 5 }),
      findChallenges(db, { userId: uid, ...point, countries: me.countries, status: 'uncompleted', limit: 100 }),
      db.query<{ id: string; parent_id: string | null }>('SELECT id, parent_id FROM categories'),
      loadGoalProgress(db, uid),
    ]);

    const parentOf = new Map(categories.rows.map((row) => [row.id, row.parent_id]));
    const boosted = new Set(me.interests.flatMap((interest) => INTEREST_CATEGORIES[interest] ?? []));
    const preferredDifficulty = DIFFICULTY_ORDER.indexOf(me.difficulty);
    const todayId = daily[0]?.id;

    const recommended = candidates
      .filter((challenge) => challenge.id !== todayId)
      .map((challenge) => {
        let score = 0;
        const parent = parentOf.get(challenge.categoryId);
        if (boosted.has(challenge.categoryId) || (parent && boosted.has(parent))) score += 3;
        score -= Math.abs(DIFFICULTY_ORDER.indexOf(challenge.difficulty) - preferredDifficulty);
        if (challenge.distanceM !== null) score -= Math.min(challenge.distanceM / 50_000, 3);
        return { challenge, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((entry) => entry.challenge);

    return {
      me: {
        displayName: me.displayName,
        avatarUrl: me.avatarUrl,
        level: me.level,
        onboarded: me.onboarded,
        streak: me.streak,
      },
      todaysChallenge: daily[0] ?? null,
      dailyBonusXp: DAILY_BONUS_XP,
      goals,
      nearby: { radiusKm: NEARBY_RADIUS_KM, count: nearby.length, challenges: nearby },
      inProgress,
      recommended,
    };
  });
};
