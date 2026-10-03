import { z } from 'zod';

import { userId } from '../auth/plugin.js';
import { withTransaction } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import { CountrySchema, PageQuery, parse, UuidSchema, type RoutePlugin } from '../http.js';
import { canSeeSql, loadPosts } from '../services/posts.js';
import { getLevelInfo } from '../services/progression.js';
import { loadStats } from '../services/users.js';

const IdParams = z.object({ id: UuidSchema });

const LeaderboardQuery = z.object({
  scope: z.enum(['global', 'friends', 'country']).default('global'),
  period: z.enum(['week', 'month', 'all']).default('week'),
  country: CountrySchema.optional(),
});

interface Relationship {
  following: boolean;
  followsMe: boolean;
  blockedByMe: boolean;
  blockedMe: boolean;
}

export const socialRoutes: RoutePlugin = (app, { db, auth, photos, push }) => {
  async function relationship(viewer: string | null, other: string): Promise<Relationship> {
    if (!viewer || viewer === other) return { following: false, followsMe: false, blockedByMe: false, blockedMe: false };
    const { rows } = await db.query<Relationship>(
      `SELECT EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND followee_id = $2) AS following,
              EXISTS (SELECT 1 FROM follows WHERE follower_id = $2 AND followee_id = $1) AS "followsMe",
              EXISTS (SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2) AS "blockedByMe",
              EXISTS (SELECT 1 FROM blocks WHERE blocker_id = $2 AND blocked_id = $1) AS "blockedMe"`,
      [viewer, other],
    );
    return rows[0]!;
  }

  app.get('/v1/users', { preHandler: auth.requireAuth }, async (request) => {
    const { q } = parse(z.object({ q: z.string().trim().min(2).max(40) }), request.query);
    const { rows } = await db.query(
      `SELECT u.id, u.display_name AS "displayName", u.avatar_url AS "avatarUrl", u.level
       FROM users u
       WHERE lower(u.display_name) LIKE $2 AND u.id <> $1 AND u.profile_visibility <> 'private'
         AND ${canSeeSql('u.id', null)}
       ORDER BY u.xp DESC LIMIT 20`,
      [userId(request), `${q.toLocaleLowerCase().replace(/[%_\\]/g, (ch) => `\\${ch}`)}%`],
    );
    return { users: rows };
  });

  app.get('/v1/users/:id', { preHandler: auth.optionalAuth }, async (request) => {
    const { id } = parse(IdParams, request.params);
    const viewer = request.auth?.userId ?? null;
    const { rows } = await db.query<{
      id: string;
      display_name: string;
      avatar_url: string | null;
      bio: string;
      xp: number;
      created_at: Date;
      profile_visibility: string;
      banned_at: Date | null;
    }>(
      'SELECT id, display_name, avatar_url, bio, xp, created_at, profile_visibility, banned_at FROM users WHERE id = $1',
      [id],
    );
    const user = rows[0];
    const rel = await relationship(viewer, id);
    if (!user || user.banned_at || rel.blockedMe) throw notFound('User');

    const isMe = viewer === id;
    const isFriend = rel.following && rel.followsMe;
    const canView =
      isMe || user.profile_visibility === 'public' || (user.profile_visibility === 'friends' && isFriend);

    const [stats, badges] = canView
      ? await Promise.all([
          loadStats(db, id),
          db.query(
            `SELECT a.id, a.title, a.icon, ua.unlocked_at AS "unlockedAt"
             FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
             WHERE ua.user_id = $1 ORDER BY ua.unlocked_at DESC LIMIT 24`,
            [id],
          ),
        ])
      : [null, null];

    return {
      user: {
        id: user.id,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: canView ? user.bio : '',
        level: await getLevelInfo(db, user.xp),
        joinedAt: user.created_at.toISOString(),
        profileVisibility: user.profile_visibility,
      },
      relationship: { ...rel, isFriend, isMe },
      canView,
      stats: stats && {
        challengesCompleted: stats.challengesCompleted,
        placesVisited: stats.placesVisited,
        countriesVisited: stats.countriesVisited,
        achievementsUnlocked: stats.achievementsUnlocked,
        collectionsCompleted: stats.collectionsCompleted,
        followers: stats.followers,
        following: stats.following,
        countryProgress: stats.countryProgress,
      },
      badges: badges?.rows ?? [],
    };
  });

  app.get('/v1/users/:id/posts', { preHandler: auth.optionalAuth }, async (request) => {
    const { id } = parse(IdParams, request.params);
    const page = parse(PageQuery, request.query);
    return {
      posts: await loadPosts(db, photos, {
        viewerId: request.auth?.userId ?? null,
        authorId: id,
        before: page.before,
        limit: page.limit,
      }),
    };
  });

  for (const direction of ['followers', 'following'] as const) {
    app.get(`/v1/users/:id/${direction}`, { preHandler: auth.requireAuth }, async (request) => {
      const { id } = parse(IdParams, request.params);
      const [join, match] = direction === 'followers' ? ['follower_id', 'followee_id'] : ['followee_id', 'follower_id'];
      const { rows } = await db.query(
        `SELECT u.id, u.display_name AS "displayName", u.avatar_url AS "avatarUrl", u.level
         FROM follows f JOIN users u ON u.id = f.${join}
         WHERE f.${match} = $2 AND ${canSeeSql('$2', null)} AND ${canSeeSql('u.id', null)}
         ORDER BY f.created_at DESC LIMIT 200`,
        [userId(request), id],
      );
      return { users: rows };
    });
  }

  app.post(
    '/v1/users/:id/follow',
    { preHandler: auth.requireAuth, config: { rateLimit: { max: 60, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const { id } = parse(IdParams, request.params);
      const uid = userId(request);
      if (id === uid) throw badRequest('self_follow', 'You cannot follow yourself');
      const rel = await relationship(uid, id);
      if (rel.blockedByMe || rel.blockedMe) throw notFound('User');
      const inserted = await db.query(
        `INSERT INTO follows (follower_id, followee_id)
         SELECT $1, id FROM users WHERE id = $2 AND banned_at IS NULL
         ON CONFLICT DO NOTHING`,
        [uid, id],
      );
      if (inserted.rowCount === 0 && !rel.following) throw notFound('User');
      if (inserted.rowCount === 1) {
        const { rows } = await db.query<{ display_name: string }>('SELECT display_name FROM users WHERE id = $1', [uid]);
        push.notify([id], 'social', {
          title: 'New follower',
          body: `${rows[0]?.display_name ?? 'Someone'} started following you`,
          url: `/user/${uid}`,
        });
      }
      return reply.code(204).send();
    },
  );

  app.delete('/v1/users/:id/follow', { preHandler: auth.requireAuth }, async (request, reply) => {
    const { id } = parse(IdParams, request.params);
    await db.query('DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2', [userId(request), id]);
    return reply.code(204).send();
  });

  app.post('/v1/users/:id/block', { preHandler: auth.requireAuth }, async (request, reply) => {
    const { id } = parse(IdParams, request.params);
    const uid = userId(request);
    if (id === uid) throw badRequest('self_block', 'You cannot block yourself');
    await withTransaction(db, async (client) => {
      const inserted = await client.query(
        `INSERT INTO blocks (blocker_id, blocked_id) SELECT $1, id FROM users WHERE id = $2 ON CONFLICT DO NOTHING`,
        [uid, id],
      );
      if (inserted.rowCount === 0) {
        const exists = await client.query('SELECT 1 FROM users WHERE id = $1', [id]);
        if (exists.rowCount === 0) throw notFound('User');
      }
      await client.query(
        'DELETE FROM follows WHERE (follower_id = $1 AND followee_id = $2) OR (follower_id = $2 AND followee_id = $1)',
        [uid, id],
      );
    });
    return reply.code(204).send();
  });

  app.delete('/v1/users/:id/block', { preHandler: auth.requireAuth }, async (request, reply) => {
    const { id } = parse(IdParams, request.params);
    await db.query('DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [userId(request), id]);
    return reply.code(204).send();
  });

  app.get('/v1/leaderboards', { preHandler: auth.requireAuth }, async (request) => {
    const query = parse(LeaderboardQuery, request.query);
    const uid = userId(request);
    if (query.scope === 'country' && !query.country) {
      throw badRequest('missing_country', 'country is required for the country leaderboard');
    }

    const params: unknown[] = [uid];
    const filters = [
      'u.banned_at IS NULL',
      `(u.id = $1 OR u.profile_visibility = 'public')`,
      `NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = $1))`,
    ];
    if (query.scope === 'friends') {
      filters.push(`(u.id = $1 OR (EXISTS (SELECT 1 FROM follows f1 WHERE f1.follower_id = $1 AND f1.followee_id = u.id)
                     AND EXISTS (SELECT 1 FROM follows f2 WHERE f2.follower_id = u.id AND f2.followee_id = $1)))`);
    }

    let scoreSql: string;
    if (query.scope === 'country') {
      // Country boards rank by challenges completed in that country, optionally within the period.
      params.push(query.country);
      const since =
        query.period === 'all'
          ? ''
          : `AND a.completed_at >= date_trunc('${query.period}', now() AT TIME ZONE 'Europe/Riga') AT TIME ZONE 'Europe/Riga'`;
      scoreSql = `(SELECT count(*) FROM challenge_attempts a JOIN challenges ch ON ch.id = a.challenge_id
                   WHERE a.user_id = u.id AND a.status = 'completed' AND ch.country = $2::country_code ${since})`;
    } else if (query.period === 'all') {
      scoreSql = 'u.xp';
    } else {
      scoreSql = `(SELECT coalesce(sum(x.amount), 0) FROM xp_events x WHERE x.user_id = u.id
                   AND x.created_at >= date_trunc('${query.period}', now() AT TIME ZONE 'Europe/Riga') AT TIME ZONE 'Europe/Riga')`;
    }

    const { rows } = await db.query<{
      id: string;
      displayName: string;
      avatarUrl: string | null;
      level: number;
      score: number;
      rank: number;
    }>(
      `WITH scored AS (
         SELECT u.id, u.display_name AS "displayName", u.avatar_url AS "avatarUrl", u.level, ${scoreSql} AS score
         FROM users u WHERE ${filters.join(' AND ')}
       ), ranked AS (
         SELECT *, rank() OVER (ORDER BY score DESC) AS rank FROM scored WHERE score > 0 OR id = $1
       )
       SELECT * FROM ranked WHERE rank <= 50 OR id = $1 ORDER BY rank, "displayName" LIMIT 51`,
      params,
    );
    const me = rows.find((row) => row.id === uid) ?? null;
    return {
      scope: query.scope,
      period: query.period,
      country: query.country ?? null,
      metric: query.scope === 'country' ? 'challenges' : 'xp',
      entries: rows.filter((row) => row.rank <= 50 && (row.score > 0 || row.id === uid)),
      me,
    };
  });
};
