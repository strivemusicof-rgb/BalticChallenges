import { z } from 'zod';

import { userId } from '../auth/plugin.js';
import { withTransaction, type DbClient } from '../db.js';
import { badRequest, conflict, forbidden, notFound } from '../errors.js';
import { CountrySchema, DifficultySchema, parse, UuidSchema, type RoutePlugin } from '../http.js';
import { finalizeCompletion } from '../services/completion.js';

const IdParams = z.object({ id: UuidSchema });
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
const StatusSchema = z.enum(['draft', 'published', 'archived']);

const PlaceBody = z.object({
  slug: Slug,
  name: z.string().trim().min(2).max(120),
  description: z.string().max(4000).default(''),
  country: CountrySchema,
  regionId: z.number().int().positive().nullable().default(null),
  city: z.string().max(80).nullable().default(null),
  categoryId: z.string().max(40),
  lat: z.number().min(53).max(60.5),
  lng: z.number().min(20).max(28.5),
  radiusM: z.number().int().min(20).max(5000).default(150),
  images: z.array(z.url()).max(10).default([]),
  difficulty: DifficultySchema.default('casual'),
  terrain: z.string().max(200).nullable().default(null),
  accessibility: z.string().max(200).nullable().default(null),
  seasonMonths: z.array(z.number().int().min(1).max(12)).min(1).max(12).default([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
  estDurationMin: z.number().int().positive().max(10_000).nullable().default(null),
  familyFriendly: z.boolean().nullable().default(null),
  dogFriendly: z.boolean().nullable().default(null),
  parking: z.boolean().nullable().default(null),
  officialUrl: z.url().nullable().default(null),
  temporarilyClosed: z.boolean().default(false),
  status: StatusSchema.default('draft'),
});

const ChallengeBody = z.object({
  slug: Slug,
  title: z.string().trim().min(2).max(120),
  description: z.string().max(4000).default(''),
  type: z.enum(['visit', 'discover', 'photo', 'collection', 'route', 'multi_step', 'seasonal', 'social', 'time_limited']),
  categoryId: z.string().max(40),
  placeId: UuidSchema.nullable().default(null),
  country: CountrySchema.nullable().default(null),
  regionId: z.number().int().positive().nullable().default(null),
  difficulty: DifficultySchema.default('casual'),
  xpReward: z.number().int().min(1).max(5000),
  verification: z.enum(['gps', 'gps_checkin', 'photo', 'gps_photo', 'route', 'manual']).default('gps'),
  startsAt: z.iso.datetime({ offset: true }).nullable().default(null),
  endsAt: z.iso.datetime({ offset: true }).nullable().default(null),
  isPro: z.boolean().default(false),
  status: StatusSchema.default('draft'),
});

const PLACE_COLUMNS: Record<string, string> = {
  slug: 'slug', name: 'name', description: 'description', country: 'country', regionId: 'region_id', city: 'city',
  categoryId: 'category_id', radiusM: 'radius_m', images: 'images', difficulty: 'difficulty', terrain: 'terrain',
  accessibility: 'accessibility', seasonMonths: 'season_months', estDurationMin: 'est_duration_min',
  familyFriendly: 'family_friendly', dogFriendly: 'dog_friendly', parking: 'parking', officialUrl: 'official_url',
  temporarilyClosed: 'temporarily_closed', status: 'status',
};

const CHALLENGE_COLUMNS: Record<string, string> = {
  slug: 'slug', title: 'title', description: 'description', type: 'type', categoryId: 'category_id',
  placeId: 'place_id', country: 'country', regionId: 'region_id', difficulty: 'difficulty', xpReward: 'xp_reward',
  verification: 'verification', startsAt: 'starts_at', endsAt: 'ends_at', isPro: 'is_pro', status: 'status',
};

const CASTS: Record<string, string> = {
  country: '::country_code', difficulty: '::difficulty', status: '::content_status', type: '::challenge_type',
  verification: '::verification_type', season_months: '::smallint[]',
};

async function audit(db: DbClient, actor: string, action: string, targetType: string, targetId: string, details = {}) {
  await db.query(
    'INSERT INTO admin_audit_log (actor_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
    [actor, action, targetType, targetId, JSON.stringify(details)],
  );
}

/** Only keys the client actually sent are updated, so schema defaults never overwrite stored values. */
function updateSet(body: Record<string, unknown>, raw: unknown, columns: Record<string, string>, startAt: number) {
  const sent = new Set(Object.keys((raw ?? {}) as object));
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(body)) {
    const column = columns[key];
    if (!column || value === undefined || !sent.has(key)) continue;
    values.push(value);
    sets.push(`${column} = $${startAt + values.length}${CASTS[column] ?? ''}`);
  }
  return { sets, values };
}

function translateDbError(error: unknown): never {
  const code = (error as { code?: string }).code;
  if (code === '23505') throw conflict('duplicate', 'Slug already in use');
  if (code === '23503') throw badRequest('invalid_reference', 'Referenced category, place or region does not exist');
  if (code === '23514') throw badRequest('constraint_failed', 'Values violate a content rule (check type, place and dates)');
  throw error;
}

export const adminRoutes: RoutePlugin = (app, { db, auth }) => {
  const staff = { preHandler: auth.requireRole('moderator', 'admin') };
  const adminOnly = { preHandler: auth.requireRole('admin') };

  app.get('/v1/admin/stats', staff, async () => {
    const { rows } = await db.query(`
      SELECT
        (SELECT count(*) FROM users) AS "usersTotal",
        (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days') AS "usersNew7d",
        (SELECT count(DISTINCT user_id) FROM xp_events WHERE created_at > now() - interval '1 day') AS "activeUsers1d",
        (SELECT count(DISTINCT user_id) FROM xp_events WHERE created_at > now() - interval '7 days') AS "activeUsers7d",
        (SELECT count(*) FROM challenge_attempts WHERE status = 'completed' AND completed_at > now() - interval '1 day') AS "completions1d",
        (SELECT count(*) FROM challenge_attempts WHERE status = 'completed' AND completed_at > now() - interval '7 days') AS "completions7d",
        (SELECT count(*) FROM challenge_attempts WHERE status = 'in_progress') AS "inProgress",
        (SELECT count(*) FROM posts WHERE created_at > now() - interval '7 days') AS "posts7d",
        (SELECT count(*) FROM reports WHERE status = 'open') AS "openReports",
        (SELECT count(*) FROM challenge_attempts WHERE status = 'flagged') AS "flaggedCompletions",
        (SELECT count(*) FROM posts WHERE moderation = 'pending') AS "pendingPosts",
        (SELECT count(*) FROM challenges WHERE status = 'published') AS "publishedChallenges",
        (SELECT count(*) FROM places WHERE status = 'published') AS "publishedPlaces"`);
    const top = await db.query(`
      SELECT ch.id, ch.title, count(*) AS completions
      FROM challenge_attempts a JOIN challenges ch ON ch.id = a.challenge_id
      WHERE a.status = 'completed' AND a.completed_at > now() - interval '30 days'
      GROUP BY ch.id ORDER BY completions DESC LIMIT 10`);
    const rejections = await db.query(`
      SELECT reason, count(*) AS n FROM check_ins
      WHERE verdict <> 'accepted' AND received_at > now() - interval '7 days'
      GROUP BY reason ORDER BY n DESC`);
    return { stats: rows[0], topChallenges: top.rows, checkInRejections7d: rejections.rows };
  });

  // ---- Reports ---------------------------------------------------------------------------------

  app.get('/v1/admin/reports', staff, async (request) => {
    const { status } = parse(z.object({ status: z.enum(['open', 'actioned', 'dismissed']).default('open') }), request.query);
    const { rows } = await db.query(
      `SELECT r.id, r.target_type AS "targetType", r.target_id AS "targetId", r.reason, r.details, r.status,
              r.created_at AS "createdAt", r.resolution_note AS "resolutionNote",
              json_build_object('id', ru.id, 'displayName', ru.display_name) AS reporter,
              (SELECT count(*) FROM reports r2 WHERE r2.target_type = r.target_type AND r2.target_id = r.target_id) AS "reportCount",
              CASE r.target_type
                WHEN 'post' THEN (SELECT json_build_object('authorId', p.user_id, 'author', u.display_name, 'body', p.body,
                                    'moderation', p.moderation,
                                    'photos', (SELECT coalesce(json_agg(ph.storage_key), '[]') FROM post_photos pp
                                               JOIN photos ph ON ph.id = pp.photo_id WHERE pp.post_id = p.id))
                                  FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = r.target_id)
                WHEN 'comment' THEN (SELECT json_build_object('authorId', c.user_id, 'author', u.display_name, 'body', c.body,
                                       'moderation', c.moderation)
                                     FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = r.target_id)
                WHEN 'user' THEN (SELECT json_build_object('authorId', u.id, 'author', u.display_name, 'body', u.bio,
                                    'bannedAt', u.banned_at) FROM users u WHERE u.id = r.target_id)
                WHEN 'photo' THEN (SELECT json_build_object('authorId', ph.user_id, 'author', u.display_name,
                                     'photos', json_build_array(ph.storage_key), 'moderation', ph.moderation)
                                   FROM photos ph JOIN users u ON u.id = ph.user_id WHERE ph.id = r.target_id)
                WHEN 'challenge' THEN (SELECT json_build_object('body', ch.title) FROM challenges ch WHERE ch.id = r.target_id)
              END AS target
       FROM reports r LEFT JOIN users ru ON ru.id = r.reporter_id
       WHERE r.status = $1 ORDER BY r.created_at LIMIT 200`,
      [status],
    );
    return { reports: rows };
  });

  app.post('/v1/admin/reports/:id/resolve', staff, async (request) => {
    const { id } = parse(IdParams, request.params);
    const body = parse(
      z.object({
        action: z.enum(['dismiss', 'hide_content', 'restore_content', 'ban_user']),
        note: z.string().trim().max(1000).optional(),
      }),
      request.body,
    );
    const actor = userId(request);
    if (body.action === 'ban_user' && request.auth!.role !== 'admin') throw forbidden('Only admins can ban users');

    await withTransaction(db, async (client) => {
      const { rows } = await client.query<{ target_type: string; target_id: string }>(
        'SELECT target_type, target_id FROM reports WHERE id = $1 FOR UPDATE',
        [id],
      );
      const report = rows[0];
      if (!report) throw notFound('Report');

      const table = { post: 'posts', comment: 'comments', photo: 'photos' }[report.target_type];
      if (body.action === 'hide_content' || body.action === 'restore_content') {
        if (!table) throw badRequest('not_hideable', 'This report target cannot be hidden');
        await client.query(`UPDATE ${table} SET moderation = $2::moderation_state WHERE id = $1`, [
          report.target_id,
          body.action === 'hide_content' ? 'hidden' : 'visible',
        ]);
      }
      if (body.action === 'ban_user') {
        const owner =
          report.target_type === 'user'
            ? report.target_id
            : table
              ? (await client.query<{ user_id: string }>(`SELECT user_id FROM ${table} WHERE id = $1`, [report.target_id]))
                  .rows[0]?.user_id
              : undefined;
        if (!owner) throw badRequest('no_owner', 'Could not determine whom to ban');
        await banUser(client, actor, owner, body.note ?? `Report ${id}`);
      }

      const status = body.action === 'dismiss' ? 'dismissed' : 'actioned';
      // Resolving one report resolves every open report on the same target.
      await client.query(
        `UPDATE reports SET status = $3, resolved_by = $4, resolved_at = now(), resolution_note = $5
         WHERE status = 'open' AND target_type = $1 AND target_id = $2`,
        [report.target_type, report.target_id, status, actor, body.note ?? null],
      );
      await audit(client, actor, `report_${body.action}`, report.target_type, report.target_id, { reportId: id });
    });
    return { ok: true };
  });

  app.get('/v1/admin/posts/pending', staff, async () => {
    const { rows } = await db.query(
      `SELECT p.id, p.body, p.created_at AS "createdAt", u.id AS "authorId", u.display_name AS author
       FROM posts p JOIN users u ON u.id = p.user_id WHERE p.moderation = 'pending' ORDER BY p.created_at LIMIT 200`,
    );
    return { posts: rows };
  });

  app.post('/v1/admin/posts/:id/moderation', staff, async (request) => {
    const { id } = parse(IdParams, request.params);
    const { state } = parse(z.object({ state: z.enum(['visible', 'hidden', 'removed']) }), request.body);
    await withTransaction(db, async (client) => {
      const { rowCount } = await client.query('UPDATE posts SET moderation = $2::moderation_state WHERE id = $1', [id, state]);
      if (rowCount === 0) throw notFound('Post');
      await audit(client, userId(request), `post_${state}`, 'post', id);
    });
    return { ok: true };
  });

  // ---- Flagged completions ---------------------------------------------------------------------

  app.get('/v1/admin/flagged', staff, async () => {
    const { rows } = await db.query(
      `SELECT a.id AS "attemptId", a.updated_at AS "flaggedAt",
              json_build_object('id', u.id, 'displayName', u.display_name, 'createdAt', u.created_at) AS user,
              json_build_object('id', ch.id, 'title', ch.title, 'xpReward', ch.xp_reward) AS challenge,
              (SELECT json_agg(json_build_object('verdict', c.verdict, 'reason', c.reason, 'distanceM', round(c.distance_m),
                        'accuracyM', c.accuracy_m, 'isMocked', c.is_mocked, 'deviceTime', c.device_time,
                        'receivedAt', c.received_at, 'lat', ST_Y(c.geog::geometry), 'lng', ST_X(c.geog::geometry))
                      ORDER BY c.received_at DESC)
               FROM check_ins c WHERE c.attempt_id = a.id) AS "checkIns",
              (SELECT count(*) FROM challenge_attempts a2 WHERE a2.user_id = u.id AND a2.status = 'flagged') AS "userFlagCount"
       FROM challenge_attempts a
       JOIN users u ON u.id = a.user_id
       JOIN challenges ch ON ch.id = a.challenge_id
       WHERE a.status = 'flagged' ORDER BY a.updated_at LIMIT 200`,
    );
    return { flagged: rows };
  });

  app.post('/v1/admin/flagged/:id/:decision', staff, async (request) => {
    const { id, decision } = parse(z.object({ id: UuidSchema, decision: z.enum(['approve', 'reject']) }), request.params);
    const actor = userId(request);
    return withTransaction(db, async (client) => {
      const { rows } = await client.query<{ user_id: string; challenge_id: string; xp_reward: number }>(
        `SELECT a.user_id, a.challenge_id, ch.xp_reward FROM challenge_attempts a JOIN challenges ch ON ch.id = a.challenge_id
         WHERE a.id = $1 AND a.status = 'flagged' FOR UPDATE OF a`,
        [id],
      );
      const attempt = rows[0];
      if (!attempt) throw notFound('Flagged completion');
      await client.query(
        `UPDATE check_ins SET reviewed_by = $2, reviewed_at = now() WHERE attempt_id = $1 AND verdict = 'flagged'`,
        [id, actor],
      );
      await audit(client, actor, `flagged_${decision}`, 'attempt', id);
      if (decision === 'reject') {
        await client.query(`UPDATE challenge_attempts SET status = 'rejected' WHERE id = $1`, [id]);
        return { status: 'rejected' };
      }
      const outcome = await finalizeCompletion(client, {
        userId: attempt.user_id,
        attemptId: id,
        challengeId: attempt.challenge_id,
        xpReward: attempt.xp_reward,
        isDaily: false,
      });
      return { status: 'completed', xpEarned: outcome.xpEarned };
    });
  });

  // ---- Users -----------------------------------------------------------------------------------

  async function banUser(client: DbClient, actor: string, target: string, reason: string) {
    if (target === actor) throw badRequest('self_ban', 'You cannot ban yourself');
    const { rows } = await client.query<{ role: string }>(
      'UPDATE users SET banned_at = now(), ban_reason = $2 WHERE id = $1 RETURNING role',
      [target, reason],
    );
    if (!rows[0]) throw notFound('User');
    if (rows[0].role !== 'user') throw forbidden('Demote staff before banning');
    await client.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [target]);
    await client.query(`UPDATE posts SET moderation = 'hidden' WHERE user_id = $1 AND moderation = 'visible'`, [target]);
    await audit(client, actor, 'ban_user', 'user', target, { reason });
  }

  app.get('/v1/admin/users', staff, async (request) => {
    const { q } = parse(z.object({ q: z.string().trim().max(80).optional() }), request.query);
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.display_name AS "displayName", u.role, u.xp, u.level, u.created_at AS "createdAt",
              u.banned_at AS "bannedAt", u.ban_reason AS "banReason",
              (SELECT count(*) FROM challenge_attempts a WHERE a.user_id = u.id AND a.status = 'completed') AS completions,
              (SELECT count(*) FROM challenge_attempts a WHERE a.user_id = u.id AND a.status IN ('flagged', 'rejected')) AS flags,
              (SELECT count(*) FROM reports r WHERE r.target_type = 'user' AND r.target_id = u.id) AS reports
       FROM users u
       WHERE $1::text IS NULL OR u.display_name ILIKE '%' || $1 || '%' OR u.email::text ILIKE '%' || $1 || '%'
          OR u.id::text = $1
       ORDER BY u.created_at DESC LIMIT 100`,
      [q || null],
    );
    return { users: rows };
  });

  app.post('/v1/admin/users/:id/ban', adminOnly, async (request) => {
    const { id } = parse(IdParams, request.params);
    const { reason } = parse(z.object({ reason: z.string().trim().min(3).max(500) }), request.body);
    await withTransaction(db, (client) => banUser(client, userId(request), id, reason));
    return { ok: true };
  });

  app.post('/v1/admin/users/:id/unban', adminOnly, async (request) => {
    const { id } = parse(IdParams, request.params);
    await withTransaction(db, async (client) => {
      const { rowCount } = await client.query('UPDATE users SET banned_at = NULL, ban_reason = NULL WHERE id = $1', [id]);
      if (rowCount === 0) throw notFound('User');
      await audit(client, userId(request), 'unban_user', 'user', id);
    });
    return { ok: true };
  });

  app.post('/v1/admin/users/:id/role', adminOnly, async (request) => {
    const { id } = parse(IdParams, request.params);
    const { role } = parse(z.object({ role: z.enum(['user', 'moderator', 'admin']) }), request.body);
    if (id === userId(request)) throw badRequest('self_role', 'You cannot change your own role');
    await withTransaction(db, async (client) => {
      const { rowCount } = await client.query('UPDATE users SET role = $2::user_role WHERE id = $1', [id, role]);
      if (rowCount === 0) throw notFound('User');
      await client.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [id]);
      await audit(client, userId(request), 'set_role', 'user', id, { role });
    });
    return { ok: true };
  });

  // ---- Content ---------------------------------------------------------------------------------

  app.get('/v1/admin/places', staff, async (request) => {
    const { q } = parse(z.object({ q: z.string().trim().max(80).optional() }), request.query);
    const { rows } = await db.query(
      `SELECT p.id, p.slug, p.name, p.description, p.country::text AS country, p.region_id AS "regionId", p.city,
              p.category_id AS "categoryId", ST_Y(p.geog::geometry) AS lat, ST_X(p.geog::geometry) AS lng,
              p.radius_m AS "radiusM", p.images, p.difficulty, p.terrain, p.accessibility,
              p.season_months AS "seasonMonths", p.est_duration_min AS "estDurationMin",
              p.family_friendly AS "familyFriendly", p.dog_friendly AS "dogFriendly", p.parking,
              p.official_url AS "officialUrl", p.temporarily_closed AS "temporarilyClosed", p.status,
              (SELECT count(*) FROM challenges ch WHERE ch.place_id = p.id) AS "challengeCount"
       FROM places p
       WHERE $1::text IS NULL OR p.name ILIKE '%' || $1 || '%' OR p.slug ILIKE '%' || $1 || '%'
       ORDER BY p.country, p.name LIMIT 500`,
      [q || null],
    );
    return { places: rows };
  });

  app.post('/v1/admin/places', adminOnly, async (request, reply) => {
    const body = parse(PlaceBody, request.body);
    const { rows } = await db
      .query<{ id: string }>(
        `INSERT INTO places (slug, name, description, country, region_id, city, category_id, geog, radius_m, images,
                             difficulty, terrain, accessibility, season_months, est_duration_min, family_friendly,
                             dog_friendly, parking, official_url, temporarily_closed, status)
         VALUES ($1, $2, $3, $4::country_code, $5, $6, $7, ST_SetSRID(ST_MakePoint($9, $8), 4326)::geography, $10, $11,
                 $12::difficulty, $13, $14, $15::smallint[], $16, $17, $18, $19, $20, $21, $22::content_status)
         RETURNING id`,
        [
          body.slug, body.name, body.description, body.country, body.regionId, body.city, body.categoryId, body.lat,
          body.lng, body.radiusM, body.images, body.difficulty, body.terrain, body.accessibility, body.seasonMonths,
          body.estDurationMin, body.familyFriendly, body.dogFriendly, body.parking, body.officialUrl,
          body.temporarilyClosed, body.status,
        ],
      )
      .catch(translateDbError);
    await audit(db, userId(request), 'create_place', 'place', rows[0]!.id);
    return reply.code(201).send({ id: rows[0]!.id });
  });

  app.patch('/v1/admin/places/:id', adminOnly, async (request) => {
    const { id } = parse(IdParams, request.params);
    const body = parse(PlaceBody.partial().strict(), request.body);
    const { sets, values } = updateSet(body, request.body, PLACE_COLUMNS, 1);
    const raw = (request.body ?? {}) as Record<string, unknown>;
    if ('lat' in raw || 'lng' in raw) {
      if (body.lat === undefined || body.lng === undefined) throw badRequest('invalid_location', 'Send lat and lng together');
      values.push(body.lng, body.lat);
      sets.push(`geog = ST_SetSRID(ST_MakePoint($${values.length}, $${values.length + 1}), 4326)::geography`);
    }
    if (sets.length === 0) throw badRequest('empty_update', 'Nothing to update');
    const { rowCount } = await db
      .query(`UPDATE places SET ${sets.join(', ')} WHERE id = $1`, [id, ...values])
      .catch(translateDbError);
    if (rowCount === 0) throw notFound('Place');
    await audit(db, userId(request), 'update_place', 'place', id, body);
    return { ok: true };
  });

  app.get('/v1/admin/challenges', staff, async (request) => {
    const { q } = parse(z.object({ q: z.string().trim().max(80).optional() }), request.query);
    const { rows } = await db.query(
      `SELECT ch.id, ch.slug, ch.title, ch.description, ch.type, ch.category_id AS "categoryId", ch.place_id AS "placeId",
              p.name AS "placeName", ch.country::text AS country, ch.region_id AS "regionId", ch.difficulty,
              ch.xp_reward AS "xpReward", ch.verification, ch.starts_at AS "startsAt", ch.ends_at AS "endsAt",
              ch.is_pro AS "isPro", ch.status,
              (SELECT count(*) FROM challenge_attempts a WHERE a.challenge_id = ch.id AND a.status = 'completed') AS completions
       FROM challenges ch LEFT JOIN places p ON p.id = ch.place_id
       WHERE $1::text IS NULL OR ch.title ILIKE '%' || $1 || '%' OR ch.slug ILIKE '%' || $1 || '%'
       ORDER BY ch.created_at DESC LIMIT 500`,
      [q || null],
    );
    return { challenges: rows };
  });

  app.post('/v1/admin/challenges', adminOnly, async (request, reply) => {
    const body = parse(ChallengeBody, request.body);
    const { rows } = await db
      .query<{ id: string }>(
        `INSERT INTO challenges (slug, title, description, type, category_id, place_id, country, region_id, difficulty,
                                 xp_reward, verification, starts_at, ends_at, is_pro, status, created_by)
         SELECT $1, $2, $3, $4::challenge_type, $5, $6, coalesce($7::country_code, p.country),
                coalesce($8, p.region_id), $9::difficulty, $10, $11::verification_type, $12, $13, $14,
                $15::content_status, $16
         FROM (SELECT 1) one LEFT JOIN places p ON p.id = $6
         RETURNING id`,
        [
          body.slug, body.title, body.description, body.type, body.categoryId, body.placeId, body.country,
          body.regionId, body.difficulty, body.xpReward, body.verification, body.startsAt, body.endsAt, body.isPro,
          body.status, userId(request),
        ],
      )
      .catch(translateDbError);
    await audit(db, userId(request), 'create_challenge', 'challenge', rows[0]!.id);
    return reply.code(201).send({ id: rows[0]!.id });
  });

  app.patch('/v1/admin/challenges/:id', adminOnly, async (request) => {
    const { id } = parse(IdParams, request.params);
    const body = parse(ChallengeBody.partial().strict(), request.body);
    const { sets, values } = updateSet(body, request.body, CHALLENGE_COLUMNS, 1);
    if (sets.length === 0) throw badRequest('empty_update', 'Nothing to update');
    const { rowCount } = await db
      .query(`UPDATE challenges SET ${sets.join(', ')} WHERE id = $1`, [id, ...values])
      .catch(translateDbError);
    if (rowCount === 0) throw notFound('Challenge');
    await audit(db, userId(request), 'update_challenge', 'challenge', id, body);
    return { ok: true };
  });

  // ---- Seasonal events ------------------------------------------------------------------------

  app.get('/v1/admin/events', staff, async () => {
    const { rows } = await db.query(
      `SELECT c.slug, c.title, c.status, c.starts_at AS "startsAt", c.ends_at AS "endsAt",
              (c.status = 'published' AND (c.starts_at IS NULL OR c.starts_at <= now())
                 AND (c.ends_at IS NULL OR c.ends_at > now())) AS live,
              (SELECT count(*)::int FROM collection_items ci WHERE ci.collection_id = c.id) AS challenges,
              (SELECT count(*)::int FROM user_collections uc WHERE uc.collection_id = c.id) AS finishers
       FROM collections c WHERE c.kind = 'seasonal' ORDER BY c.starts_at NULLS LAST`,
    );
    return { events: rows };
  });

  // Switching an event on publishes it with its challenges and, if it is outside its dates, starts it now
  // (and gives it two weeks if it already ended). Switching it off unpublishes both.
  app.post('/v1/admin/events/:slug/state', adminOnly, async (request) => {
    const { slug } = parse(z.object({ slug: z.string().min(1).max(80) }), request.params);
    const { active } = parse(z.object({ active: z.boolean() }), request.body);
    await withTransaction(db, async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `UPDATE collections SET
           status = $2::content_status,
           starts_at = CASE WHEN $3 AND starts_at > now() THEN now() ELSE starts_at END,
           ends_at = CASE WHEN $3 AND ends_at <= now() THEN now() + interval '14 days' ELSE ends_at END
         WHERE slug = $1 AND kind = 'seasonal' RETURNING id`,
        [slug, active ? 'published' : 'draft', active],
      );
      const event = rows[0];
      if (!event) throw notFound('Event');
      await client.query(
        `UPDATE challenges ch SET status = $2::content_status,
           starts_at = c.starts_at, ends_at = c.ends_at
         FROM collection_items ci JOIN collections c ON c.id = ci.collection_id
         WHERE ci.collection_id = $1 AND ch.id = ci.challenge_id AND ch.type = 'seasonal'`,
        [event.id, active ? 'published' : 'draft'],
      );
      await audit(client, userId(request), active ? 'event_on' : 'event_off', 'collection', event.id);
    });
    return { ok: true };
  });

  app.get('/v1/admin/reference', staff, async () => {
    const [categories, regions] = await Promise.all([
      db.query('SELECT id, parent_id AS "parentId", name, icon FROM categories ORDER BY sort'),
      db.query('SELECT id, country::text AS country, name FROM regions ORDER BY country, name'),
    ]);
    return { categories: categories.rows, regions: regions.rows };
  });

  app.get('/v1/admin/audit', staff, async () => {
    const { rows } = await db.query(
      `SELECT l.id, l.action, l.target_type AS "targetType", l.target_id AS "targetId", l.details, l.created_at AS "createdAt",
              u.display_name AS actor
       FROM admin_audit_log l LEFT JOIN users u ON u.id = l.actor_id
       ORDER BY l.id DESC LIMIT 200`,
    );
    return { entries: rows };
  });
};
