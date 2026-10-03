import { z } from 'zod';

import { userId } from '../auth/plugin.js';
import { withTransaction } from '../db.js';
import { badRequest, forbidden, notFound } from '../errors.js';
import { assertCleanText, Coordinates, PageQuery, parse, UuidSchema, type RoutePlugin } from '../http.js';
import { PHOTO_MAX_BYTES } from '../services/photos.js';
import { canSeeSql, loadPosts } from '../services/posts.js';
import { tr, type I18n } from '../i18n.js';
import { pushTexts } from '../services/push-texts.js';

const IdParams = z.object({ id: UuidSchema });

const COUNTRY_NAMES: Record<string, string> = { LV: 'Latvia', LT: 'Lithuania', EE: 'Estonia' };

const CreatePostBody = z
  .object({
    kind: z.enum(['adventure', 'achievement', 'discovery', 'route']).default('adventure'),
    body: z.string().trim().max(2000).default(''),
    photoIds: z.array(UuidSchema).max(6).default([]),
    challengeId: UuidSchema.optional(),
    placeId: UuidSchema.optional(),
    achievementId: z.string().max(60).optional(),
    showLocation: z.boolean().optional(),
    visibility: z.enum(['public', 'friends', 'private']).default('public'),
  })
  .strict()
  .refine((post) => post.body.length > 0 || post.photoIds.length > 0 || post.achievementId, {
    message: 'A post needs text, a photo or an achievement',
  });

const CommentBody = z.object({ body: z.string().trim().min(1).max(1000) }).strict();

const ReportBody = z
  .object({
    targetType: z.enum(['post', 'comment', 'user', 'photo', 'check_in', 'challenge']),
    targetId: UuidSchema,
    reason: z.enum(['spam', 'abuse', 'nudity', 'violence', 'fake_completion', 'unsafe', 'other']),
    details: z.string().trim().max(1000).optional(),
  })
  .strict();

export const postRoutes: RoutePlugin = (app, { db, auth, photos, push }) => {
  async function visiblePostOrThrow(viewer: string | null, postId: string) {
    const [post] = await loadPosts(db, photos, { viewerId: viewer, postId, limit: 1 });
    if (!post) throw notFound('Post');
    return post;
  }

  app.post(
    '/v1/photos',
    { preHandler: auth.requireAuth, config: { rateLimit: { max: 60, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const file = await request.file({ limits: { fileSize: PHOTO_MAX_BYTES, files: 1 } });
      if (!file) throw badRequest('missing_file', 'Upload an image in the "file" field');
      const buffer = await file.toBuffer();
      if (file.file.truncated) throw badRequest('file_too_large', 'Photos must be 12 MB or smaller');
      const photo = await photos.savePhoto(db, userId(request), buffer);
      return reply.code(201).send({
        photo: { id: photo.id, url: photo.url, width: photo.width, height: photo.height },
        possibleDuplicate: photo.duplicateOf.length > 0,
      });
    },
  );

  app.post(
    '/v1/posts',
    { preHandler: auth.requireAuth, config: { rateLimit: { max: 20, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const body = parse(CreatePostBody, request.body);
      assertCleanText('body', body.body);
      const uid = userId(request);

      const postId = await withTransaction(db, async (client) => {
        const { rows: userRows } = await client.query<{ show_post_location: boolean; created_at: Date }>(
          'SELECT show_post_location, created_at FROM users WHERE id = $1',
          [uid],
        );
        const user = userRows[0]!;

        let placeId = body.placeId ?? null;
        if (body.challengeId) {
          // Adventures can only reference challenges the author actually completed.
          const { rows } = await client.query<{ place_id: string | null }>(
            `SELECT ch.place_id FROM challenge_attempts a JOIN challenges ch ON ch.id = a.challenge_id
             WHERE a.user_id = $1 AND a.challenge_id = $2 AND a.status = 'completed'`,
            [uid, body.challengeId],
          );
          if (!rows[0]) throw badRequest('challenge_not_completed', 'You can only share challenges you have completed');
          placeId ??= rows[0].place_id;
        }
        if (body.achievementId) {
          const { rowCount } = await client.query(
            'SELECT 1 FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
            [uid, body.achievementId],
          );
          if (rowCount === 0) throw badRequest('achievement_locked', 'You have not unlocked this achievement');
        }

        let locationLabel: string | null = null;
        if (placeId) {
          const { rows } = await client.query<{ name: string; city: string | null; country: string }>(
            `SELECT name, city, country::text AS country FROM places WHERE id = $1 AND status = 'published'`,
            [placeId],
          );
          const place = rows[0];
          if (!place) throw badRequest('unknown_place', 'Place not found');
          locationLabel = [place.name, place.city, COUNTRY_NAMES[place.country]].filter(Boolean).join(', ');
        }

        if (body.photoIds.length > 0) {
          const { rows } = await client.query<{ n: number }>(
            'SELECT count(*) AS n FROM photos WHERE user_id = $1 AND id = ANY($2::uuid[])',
            [uid, body.photoIds],
          );
          if (rows[0]!.n !== new Set(body.photoIds).size) throw badRequest('unknown_photo', 'Upload photos before posting');
        }

        // Brand-new accounts post into a review queue rather than straight to the feed.
        const isNewAccount = Date.now() - user.created_at.getTime() < 24 * 60 * 60 * 1000;
        const hasLinks = /\b(?:https?:\/\/|www\.)/i.test(body.body);

        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO posts (user_id, kind, body, place_id, challenge_id, achievement_id, location_label,
                              show_location, visibility, moderation)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::visibility, $10::moderation_state) RETURNING id`,
          [
            uid,
            body.kind,
            body.body,
            placeId,
            body.challengeId ?? null,
            body.achievementId ?? null,
            locationLabel,
            body.showLocation ?? user.show_post_location,
            body.visibility,
            isNewAccount && hasLinks ? 'pending' : 'visible',
          ],
        );
        const id = rows[0]!.id;
        for (const [position, photoId] of [...new Set(body.photoIds)].entries()) {
          await client.query('INSERT INTO post_photos (post_id, photo_id, position) VALUES ($1, $2, $3)', [
            id,
            photoId,
            position,
          ]);
        }
        return id;
      });

      return reply.code(201).send({ post: await visiblePostOrThrow(uid, postId) });
    },
  );

  app.get('/v1/feed', { preHandler: auth.requireAuth }, async (request) => {
    const query = parse(
      PageQuery.extend({
        scope: z.enum(['following', 'friends', 'nearby', 'global']).default('global'),
        lat: Coordinates.lat.optional(),
        lng: Coordinates.lng.optional(),
      }),
      request.query,
    );
    if (query.scope === 'nearby' && (query.lat === undefined || query.lng === undefined)) {
      throw badRequest('location_required', 'The nearby feed needs lat and lng');
    }
    return {
      posts: await loadPosts(db, photos, {
        viewerId: userId(request),
        following: query.scope === 'following',
        friends: query.scope === 'friends',
        near: query.scope === 'nearby' ? { lat: query.lat!, lng: query.lng!, km: 50 } : undefined,
        before: query.before,
        limit: query.limit,
      }),
    };
  });

  app.get('/v1/posts/:id', { preHandler: auth.optionalAuth }, async (request) => {
    const { id } = parse(IdParams, request.params);
    return { post: await visiblePostOrThrow(request.auth?.userId ?? null, id) };
  });

  app.delete('/v1/posts/:id', { preHandler: auth.requireAuth }, async (request, reply) => {
    const { id } = parse(IdParams, request.params);
    const uid = userId(request);
    const isModerator = request.auth!.role !== 'user';
    const { rows } = await db.query<{ user_id: string }>('SELECT user_id FROM posts WHERE id = $1', [id]);
    const post = rows[0];
    if (!post) throw notFound('Post');
    if (post.user_id !== uid && !isModerator) throw forbidden();
    if (post.user_id === uid) {
      await db.query('DELETE FROM posts WHERE id = $1', [id]);
    } else {
      await withTransaction(db, async (client) => {
        await client.query(`UPDATE posts SET moderation = 'removed' WHERE id = $1`, [id]);
        await client.query(
          `INSERT INTO admin_audit_log (actor_id, action, target_type, target_id) VALUES ($1, 'remove_post', 'post', $2)`,
          [uid, id],
        );
      });
    }
    return reply.code(204).send();
  });

  for (const [route, table] of [
    ['like', 'post_likes'],
    ['save', 'post_saves'],
  ] as const) {
    app.post(
      `/v1/posts/:id/${route}`,
      { preHandler: auth.requireAuth, config: { rateLimit: { max: 300, timeWindow: '1 hour' } } },
      async (request) => {
        const { id } = parse(IdParams, request.params);
        const uid = userId(request);
        await visiblePostOrThrow(uid, id);
        await db.query(`INSERT INTO ${table} (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, uid]);
        return { post: await visiblePostOrThrow(uid, id) };
      },
    );
    app.delete(`/v1/posts/:id/${route}`, { preHandler: auth.requireAuth }, async (request) => {
      const { id } = parse(IdParams, request.params);
      const uid = userId(request);
      await db.query(`DELETE FROM ${table} WHERE post_id = $1 AND user_id = $2`, [id, uid]);
      return { post: await visiblePostOrThrow(uid, id) };
    });
  }

  app.get('/v1/posts/:id/comments', { preHandler: auth.optionalAuth }, async (request) => {
    const { id } = parse(IdParams, request.params);
    const viewer = request.auth?.userId ?? null;
    await visiblePostOrThrow(viewer, id);
    const { rows } = await db.query(
      `SELECT c.id, c.body, c.created_at AS "createdAt", c.user_id = $1::uuid AS "isMine",
              json_build_object('id', u.id, 'displayName', u.display_name, 'avatarUrl', u.avatar_url, 'level', u.level) AS author
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $2 AND c.moderation = 'visible' AND ${canSeeSql('c.user_id', null)}
       ORDER BY c.created_at LIMIT 200`,
      [viewer, id],
    );
    return { comments: rows };
  });

  app.post(
    '/v1/posts/:id/comments',
    { preHandler: auth.requireAuth, config: { rateLimit: { max: 60, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const { id } = parse(IdParams, request.params);
      const body = parse(CommentBody, request.body);
      assertCleanText('body', body.body);
      const uid = userId(request);
      const post = await visiblePostOrThrow(uid, id);
      const { rows } = await db.query<{ author: { displayName: string } }>(
        `WITH inserted AS (INSERT INTO comments (post_id, user_id, body) VALUES ($1, $2, $3) RETURNING *)
         SELECT i.id, i.body, i.created_at AS "createdAt", true AS "isMine",
                json_build_object('id', u.id, 'displayName', u.display_name, 'avatarUrl', u.avatar_url, 'level', u.level) AS author
         FROM inserted i JOIN users u ON u.id = i.user_id`,
        [id, uid, body.body],
      );
      if (!post.isMine) {
        const name = rows[0]!.author.displayName;
        push.notify([post.author.id], 'social', (lang) => ({
          ...pushTexts(lang).comment(name, body.body.slice(0, 120)),
          url: `/post/${id}`,
        }));
      }
      return reply.code(201).send({ comment: rows[0] });
    },
  );

  app.delete('/v1/comments/:id', { preHandler: auth.requireAuth }, async (request, reply) => {
    const { id } = parse(IdParams, request.params);
    const uid = userId(request);
    // Authors can delete their own comments, and post owners can remove comments on their posts.
    const { rowCount } = await db.query(
      `DELETE FROM comments c USING posts p
       WHERE c.id = $1 AND p.id = c.post_id AND (c.user_id = $2 OR p.user_id = $2)`,
      [id, uid],
    );
    if (rowCount === 0) throw notFound('Comment');
    return reply.code(204).send();
  });

  app.post(
    '/v1/reports',
    { preHandler: auth.requireAuth, config: { rateLimit: { max: 30, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const body = parse(ReportBody, request.body);
      await db.query(
        `INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (reporter_id, target_type, target_id) WHERE status = 'open' DO NOTHING`,
        [userId(request), body.targetType, body.targetId, body.reason, body.details ?? null],
      );
      return reply.code(202).send({ received: true });
    },
  );

  app.get('/v1/places/:id', { preHandler: auth.optionalAuth }, async (request) => {
    const { id } = parse(z.object({ id: z.string().min(1).max(120) }), request.params);
    const viewer = request.auth?.userId ?? null;
    const isUuid = UuidSchema.safeParse(id).success;
    const { rows } = await db.query(
      `SELECT p.id, p.slug, p.name, p.description, p.i18n, p.city, p.country::text AS country,
              ST_Y(p.geog::geometry) AS lat, ST_X(p.geog::geometry) AS lng, p.images, p.image_credit AS "imageCredit", p.official_url AS "officialUrl",
              r.name AS region,
              (SELECT count(DISTINCT a.user_id) FROM challenge_attempts a JOIN challenges ch ON ch.id = a.challenge_id
                 WHERE ch.place_id = p.id AND a.status = 'completed') AS "explorerCount",
              pc.posts AS "postCount", pc.photos AS "photoCount",
              (SELECT count(*) FROM challenges ch WHERE ch.place_id = p.id AND ch.status = 'published') AS "challengeCount"
       FROM places p
       CROSS JOIN LATERAL (
         SELECT count(DISTINCT po.id) AS posts, count(pp.photo_id) AS photos
         FROM posts po LEFT JOIN post_photos pp ON pp.post_id = po.id
         WHERE po.place_id = p.id AND po.show_location AND po.visibility = 'public' AND po.moderation = 'visible'
       ) pc LEFT JOIN regions r ON r.id = p.region_id
       WHERE ${isUuid ? 'p.id = $1::uuid' : 'p.slug = $1'} AND p.status = 'published'`,
      [id],
    );
    const row = rows[0] as { id: string; name: string; description: string; i18n: I18n } | undefined;
    if (!row) throw notFound('Place');
    const { i18n, ...base } = row;
    const place = { ...base, name: tr(i18n, 'name', base.name), description: tr(i18n, 'description', base.description) };
    const [challenges, posts] = await Promise.all([
      db.query(
        `SELECT ch.id, ch.slug, ch.title, ch.i18n, ch.xp_reward AS "xpReward", ch.difficulty, cat.icon, ch.category_id AS "categoryId",
                EXISTS (SELECT 1 FROM challenge_attempts a WHERE a.challenge_id = ch.id AND a.user_id = $2::uuid
                        AND a.status = 'completed') AS completed
         FROM challenges ch JOIN categories cat ON cat.id = ch.category_id
         WHERE ch.place_id = $1 AND ch.status = 'published' ORDER BY ch.xp_reward DESC`,
        [place.id, viewer],
      ),
      loadPosts(db, photos, { viewerId: viewer, placeId: place.id, limit: 20 }),
    ]);
    return {
      place,
      challenges: challenges.rows.map(({ i18n: challengeI18n, ...challenge }) => ({
        ...challenge,
        title: tr(challengeI18n as I18n, 'title', challenge.title as string),
      })),
      posts,
    };
  });
};
