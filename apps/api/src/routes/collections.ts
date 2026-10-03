import { z } from 'zod';

import { notFound } from '../errors.js';
import { tr, type I18n } from '../i18n.js';
import { parse, type RoutePlugin } from '../http.js';
import { findChallenges } from '../services/challenges.js';

interface CollectionRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  kind: string;
  country: string | null;
  xp_reward: number;
  is_pro: boolean;
  ends_at: Date | null;
  total: number;
  completed: number;
  completed_at: Date | null;
  image_url: string | null;
  i18n: I18n;
}

function toCollection(row: CollectionRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: tr(row.i18n, 'title', row.title),
    description: tr(row.i18n, 'description', row.description),
    icon: row.icon,
    kind: row.kind,
    country: row.country,
    xpReward: row.xp_reward,
    isPro: row.is_pro,
    endsAt: row.ends_at?.toISOString() ?? null,
    total: row.total,
    completed: row.completed,
    completedAt: row.completed_at?.toISOString() ?? null,
    imageUrl: row.image_url,
  };
}

const COLLECTION_SELECT = `
  SELECT c.id, c.slug, c.title, c.description, c.i18n, c.icon, c.kind, c.country::text AS country, c.xp_reward, c.is_pro,
         c.ends_at,
         count(ci.challenge_id) AS total,
         count(a.id) AS completed,
         uc.completed_at,
         (SELECT p.images[1] FROM collection_items cover
            JOIN challenges ch ON ch.id = cover.challenge_id
            JOIN places p ON p.id = ch.place_id
          WHERE cover.collection_id = c.id AND cardinality(p.images) > 0
          ORDER BY cover.position LIMIT 1) AS image_url
  FROM collections c
  LEFT JOIN collection_items ci ON ci.collection_id = c.id
  LEFT JOIN challenge_attempts a ON a.challenge_id = ci.challenge_id AND a.user_id = $1::uuid AND a.status = 'completed'
  LEFT JOIN user_collections uc ON uc.collection_id = c.id AND uc.user_id = $1::uuid
  WHERE c.status = 'published' AND (c.starts_at IS NULL OR c.starts_at <= now()) AND (c.ends_at IS NULL OR c.ends_at > now())`;

export const collectionRoutes: RoutePlugin = (app, { db, auth }) => {
  app.get('/v1/collections', { preHandler: auth.optionalAuth }, async (request) => {
    const { rows } = await db.query<CollectionRow>(
      `${COLLECTION_SELECT} GROUP BY c.id, uc.completed_at ORDER BY c.sort`,
      [request.auth?.userId ?? null],
    );
    return { collections: rows.map(toCollection) };
  });

  app.get('/v1/collections/:slug', { preHandler: auth.optionalAuth }, async (request) => {
    const { slug } = parse(z.object({ slug: z.string().min(1).max(80) }), request.params);
    const uid = request.auth?.userId ?? null;
    const { rows } = await db.query<CollectionRow>(
      `${COLLECTION_SELECT} AND c.slug = $2 GROUP BY c.id, uc.completed_at`,
      [uid, slug],
    );
    const row = rows[0];
    if (!row) throw notFound('Collection');
    const items = await db.query<{ challenge_id: string }>(
      'SELECT challenge_id FROM collection_items WHERE collection_id = $1 ORDER BY position',
      [row.id],
    );
    const ids = items.rows.map((item) => item.challenge_id);
    const challenges = await findChallenges(db, { userId: uid, ids, sort: 'title', limit: 200 });
    const order = new Map(ids.map((id, index) => [id, index]));
    challenges.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return { collection: { ...toCollection(row), challenges } };
  });
};
