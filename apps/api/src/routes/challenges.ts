import { z } from 'zod';

import { userId } from '../auth/plugin.js';
import { withTransaction } from '../db.js';
import { evaluateCheckIn } from '../domain/verification.js';
import { badRequest, conflict, forbidden, notFound } from '../errors.js';
import { tr, type I18n } from '../i18n.js';
import { pushTexts } from '../services/push-texts.js';
import { Coordinates, CountrySchema, parse, UuidSchema, type RoutePlugin } from '../http.js';
import { findChallengeDetail, findChallenges } from '../services/challenges.js';
import { finalizeCompletion, todaysChallengeId } from '../services/completion.js';

const ListQuery = z.object({
  lat: Coordinates.lat.optional(),
  lng: Coordinates.lng.optional(),
  radiusKm: z.coerce.number().positive().max(500).optional(),
  category: z.string().max(40).optional(),
  country: z
    .string()
    .transform((value) => value.split(','))
    .pipe(z.array(CountrySchema))
    .optional(),
  status: z.enum(['completed', 'uncompleted', 'in_progress']).optional(),
  q: z.string().trim().min(2).max(60).optional(),
  sort: z.enum(['distance', 'xp', 'title']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const CompleteBody = z.object({
  lat: Coordinates.lat,
  lng: Coordinates.lng,
  accuracyM: z.number().nonnegative().max(10_000),
  isMocked: z.boolean().default(false),
  recordedAt: z.iso.datetime({ offset: true }),
  photoId: UuidSchema.optional(),
});

export const challengeRoutes: RoutePlugin = (app, { db, auth, push }) => {
  /** Tells mutual followers about a completion; at most 3 friend pushes per person per day. */
  async function notifyFriends(actorId: string, challengeId: string) {
    const { rows } = await db.query<{ friend_id: string; actor_name: string; title: string; i18n: I18n }>(
      `SELECT f.follower_id AS friend_id, u.display_name AS actor_name, ch.title, ch.i18n
       FROM follows f
       JOIN follows back ON back.follower_id = $1 AND back.followee_id = f.follower_id
       JOIN users u ON u.id = $1
       JOIN challenges ch ON ch.id = $2
       WHERE f.followee_id = $1
         AND (SELECT count(*) FROM push_reminders r
              WHERE r.user_id = f.follower_id AND r.kind = 'friend_activity' AND r.sent_at > now() - interval '1 day') < 3`,
      [actorId, challengeId],
    );
    for (const row of rows) {
      const inserted = await db.query(
        `INSERT INTO push_reminders (user_id, kind, key) VALUES ($1, 'friend_activity', $2) ON CONFLICT DO NOTHING`,
        [row.friend_id, `${actorId}:${challengeId}`],
      );
      if (inserted.rowCount !== 1) continue;
      push.notify([row.friend_id], 'social', (lang) => ({
        ...pushTexts(lang).friendCompleted(row.actor_name, (lang === 'lv' || lang === 'ru' ? row.i18n?.[lang]?.title : null) ?? row.title),
        url: `/challenge/${challengeId}`,
      }));
    }
  }

  app.get('/v1/categories', async () => {
    const { rows } = await db.query(
      `SELECT c.id, c.parent_id AS "parentId", c.name, c.icon, c.i18n,
              (SELECT count(*) FROM challenges ch
                 JOIN categories cc ON cc.id = ch.category_id
                WHERE ch.status = 'published' AND (cc.id = c.id OR cc.parent_id = c.id)) AS "challengeCount"
       FROM categories c ORDER BY c.sort`,
    );
    return { categories: rows.map(({ i18n, ...row }) => ({ ...row, name: tr(i18n, 'name', row.name) })) };
  });

  app.get('/v1/challenges', { preHandler: auth.optionalAuth }, async (request) => {
    const query = parse(ListQuery, request.query);
    if ((query.lat === undefined) !== (query.lng === undefined)) {
      throw badRequest('invalid_location', 'lat and lng must be provided together');
    }
    const challenges = await findChallenges(db, {
      userId: request.auth?.userId ?? null,
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
      category: query.category,
      countries: query.country,
      status: request.auth ? query.status : undefined,
      search: query.q,
      sort: query.sort,
      limit: query.limit,
    });
    return { challenges };
  });

  app.get('/v1/challenges/:id', { preHandler: auth.optionalAuth }, async (request) => {
    const { id } = parse(z.object({ id: z.string().min(1).max(120) }), request.params);
    const challenge = await findChallengeDetail(db, id, request.auth?.userId ?? null);
    if (!challenge) throw notFound('Challenge');
    return { challenge };
  });

  app.post('/v1/challenges/:id/start', { preHandler: auth.requireAuth }, async (request, reply) => {
    const { id } = parse(z.object({ id: UuidSchema }), request.params);
    const uid = userId(request);
    const { rows: challengeRows } = await db.query<{ is_pro: boolean }>(
      `SELECT is_pro FROM challenges WHERE id = $1 AND status = 'published'
         AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())`,
      [id],
    );
    const challenge = challengeRows[0];
    if (!challenge) throw notFound('Challenge');
    if (challenge.is_pro) throw forbidden('This challenge requires Baltic Challenges Pro');

    const { rows } = await db.query<{ id: string; status: string; started_at: Date }>(
      `INSERT INTO challenge_attempts (user_id, challenge_id) VALUES ($1, $2)
       ON CONFLICT (user_id, challenge_id) WHERE status IN ('in_progress', 'completed', 'flagged')
       DO UPDATE SET updated_at = challenge_attempts.updated_at
       RETURNING id, status, started_at`,
      [uid, id],
    );
    const attempt = rows[0]!;
    if (attempt.status === 'completed') throw conflict('already_completed', 'You have already completed this challenge');
    return reply.code(201).send({
      attempt: { id: attempt.id, status: attempt.status, startedAt: attempt.started_at.toISOString() },
    });
  });

  app.post('/v1/challenges/:id/abandon', { preHandler: auth.requireAuth }, async (request, reply) => {
    const { id } = parse(z.object({ id: UuidSchema }), request.params);
    await db.query(
      `UPDATE challenge_attempts SET status = 'abandoned'
       WHERE user_id = $1 AND challenge_id = $2 AND status = 'in_progress'`,
      [userId(request), id],
    );
    return reply.code(204).send();
  });

  app.post(
    '/v1/challenges/:id/complete',
    { preHandler: auth.requireAuth, config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request) => {
      const { id } = parse(z.object({ id: UuidSchema }), request.params);
      const body = parse(CompleteBody, request.body);
      const uid = userId(request);

      const result = await withTransaction(db, async (client) => {
        // Trails (challenges with steps) check the next unvisited step; other challenges check their place.
        const { rows: targetRows } = await client.query<{
          attempt_id: string;
          attempt_status: string;
          steps_done: number;
          step_id: string | null;
          step_count: number;
          xp_reward: number;
          verification: string;
          radius_m: number;
          distance_m: number;
        }>(
          `SELECT a.id AS attempt_id, a.status AS attempt_status, a.steps_done, st.id AS step_id,
                  (SELECT count(*)::int FROM challenge_steps s WHERE s.challenge_id = ch.id) AS step_count,
                  ch.xp_reward, ch.verification, coalesce(st.radius_m, p.radius_m) AS radius_m,
                  ST_Distance(coalesce(st.geog, p.geog), ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography) AS distance_m
           FROM challenge_attempts a
           JOIN challenges ch ON ch.id = a.challenge_id
           JOIN places p ON p.id = ch.place_id
           LEFT JOIN challenge_steps st ON st.challenge_id = ch.id AND st.position = a.steps_done + 1
           WHERE a.user_id = $1 AND a.challenge_id = $2 AND a.status IN ('in_progress', 'completed', 'flagged')
           FOR UPDATE OF a`,
          [uid, id, body.lng, body.lat],
        );
        const target = targetRows[0];
        if (!target) throw badRequest('not_started', 'Start this challenge before completing it');
        if (target.attempt_status === 'completed') {
          throw conflict('already_completed', 'You have already completed this challenge');
        }
        if (target.attempt_status === 'flagged') {
          throw conflict('under_review', 'This completion is being reviewed');
        }
        if (target.verification !== 'gps' && target.verification !== 'gps_checkin') {
          throw badRequest('unsupported_verification', 'This challenge type is not available in this app version');
        }

        const { rows: previousRows } = await client.query<{ lat: number; lng: number; at: Date }>(
          `SELECT ST_Y(geog::geometry) AS lat, ST_X(geog::geometry) AS lng, coalesce(device_time, received_at) AS at
           FROM check_ins WHERE user_id = $1 AND verdict = 'accepted'
           ORDER BY received_at DESC LIMIT 1`,
          [uid],
        );

        const now = new Date();
        const result = evaluateCheckIn({
          fix: {
            lat: body.lat,
            lng: body.lng,
            accuracyM: body.accuracyM,
            isMocked: body.isMocked,
            deviceTime: new Date(body.recordedAt),
          },
          distanceM: target.distance_m,
          radiusM: target.radius_m,
          previous: previousRows[0] ?? null,
          now,
        });

        await client.query(
          `INSERT INTO check_ins (user_id, attempt_id, geog, accuracy_m, is_mocked, device_time, distance_m, verdict, reason, step_id)
           VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5, $6, $7, $8, $9, $10, $11)`,
          [
            uid,
            target.attempt_id,
            body.lng,
            body.lat,
            body.accuracyM,
            body.isMocked,
            body.recordedAt,
            target.distance_m,
            result.verdict,
            result.verdict === 'accepted' ? null : result.reason,
            target.step_id,
          ],
        );

        const distanceM = Math.round(target.distance_m);
        if (result.verdict === 'rejected') {
          return { status: 'rejected' as const, reason: result.reason, message: result.message, distanceM };
        }
        if (body.photoId) {
          await client.query(
            `UPDATE challenge_attempts SET proof_photo_id = $1
             WHERE id = $2 AND EXISTS (SELECT 1 FROM photos WHERE id = $1 AND user_id = $3)`,
            [body.photoId, target.attempt_id, uid],
          );
        }
        if (result.verdict === 'flagged') {
          await client.query(`UPDATE challenge_attempts SET status = 'flagged' WHERE id = $1`, [target.attempt_id]);
          return { status: 'flagged' as const, reason: result.reason, message: result.message, distanceM };
        }

        if (target.step_count > 0) {
          const stepsDone = target.steps_done + 1;
          await client.query('UPDATE challenge_attempts SET steps_done = $2 WHERE id = $1', [target.attempt_id, stepsDone]);
          if (stepsDone < target.step_count) {
            return { status: 'checkpoint' as const, stepsDone, totalSteps: target.step_count, distanceM };
          }
        }

        const isDaily = (await todaysChallengeId(client, uid)) === id;
        const outcome = await finalizeCompletion(client, {
          userId: uid,
          attemptId: target.attempt_id,
          challengeId: id,
          xpReward: target.xp_reward,
          isDaily,
        });
        return { status: 'completed' as const, distanceM, ...outcome };
      });
      if (result.status === 'completed') {
        notifyFriends(uid, id).catch((error: unknown) => request.log.warn({ err: error }, 'friend activity push failed'));
      }
      return result;
    },
  );
};
