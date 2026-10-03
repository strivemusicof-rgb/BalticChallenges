import { z } from 'zod';

import { userId } from '../auth/plugin.js';
import { withTransaction, type DbClient } from '../db.js';
import { badRequest, conflict, forbidden, notFound } from '../errors.js';
import { parse, UuidSchema, type RoutePlugin } from '../http.js';
import { awardXp } from '../services/progression.js';
import { pushTexts } from '../services/push-texts.js';

export const DUEL_WIN_XP = 100;

const CreateDuelBody = z.object({
  opponentId: UuidSchema,
  metric: z.enum(['challenges', 'xp', 'places']),
  days: z.number().int().min(1).max(31),
});

interface DuelRow {
  id: string;
  metric: 'challenges' | 'xp' | 'places';
  duration_days: number;
  status: 'pending' | 'active' | 'declined' | 'cancelled' | 'finished';
  starts_at: Date | null;
  ends_at: Date | null;
  winner_id: string | null;
  created_at: Date;
  challenger_id: string;
  challenger_name: string;
  challenger_avatar: string | null;
  challenger_level: number;
  opponent_id: string;
  opponent_name: string;
  opponent_avatar: string | null;
  opponent_level: number;
}

/** Score for one side of a duel inside its window. */
async function score(db: DbClient, metric: DuelRow['metric'], user: string, from: Date, to: Date): Promise<number> {
  const sql = {
    challenges: `SELECT count(*)::int AS n FROM challenge_attempts
                 WHERE user_id = $1 AND status = 'completed' AND completed_at >= $2 AND completed_at < $3`,
    places: `SELECT count(DISTINCT ch.place_id)::int AS n FROM challenge_attempts a JOIN challenges ch ON ch.id = a.challenge_id
             WHERE a.user_id = $1 AND a.status = 'completed' AND a.completed_at >= $2 AND a.completed_at < $3`,
    xp: `SELECT coalesce(sum(amount), 0)::int AS n FROM xp_events
         WHERE user_id = $1 AND source <> 'duel' AND created_at >= $2 AND created_at < $3`,
  }[metric];
  const { rows } = await db.query<{ n: number }>(sql, [user, from, to]);
  return rows[0]?.n ?? 0;
}

export const duelRoutes: RoutePlugin = (app, { db, auth, push }) => {
  const SELECT = `
    SELECT d.id, d.metric, d.duration_days, d.status, d.starts_at, d.ends_at, d.winner_id, d.created_at,
           d.challenger_id, c.display_name AS challenger_name, c.avatar_url AS challenger_avatar, c.level AS challenger_level,
           d.opponent_id, o.display_name AS opponent_name, o.avatar_url AS opponent_avatar, o.level AS opponent_level
    FROM duels d JOIN users c ON c.id = d.challenger_id JOIN users o ON o.id = d.opponent_id`;

  /** Settles duels whose time is up: picks the winner and pays the bonus exactly once. */
  async function settle(duel: DuelRow) {
    if (duel.status !== 'active' || !duel.ends_at || duel.ends_at > new Date()) return duel;
    return withTransaction(db, async (client) => {
      const [mine, theirs] = await Promise.all([
        score(client, duel.metric, duel.challenger_id, duel.starts_at!, duel.ends_at!),
        score(client, duel.metric, duel.opponent_id, duel.starts_at!, duel.ends_at!),
      ]);
      const winner = mine === theirs ? null : mine > theirs ? duel.challenger_id : duel.opponent_id;
      const { rowCount } = await client.query(
        `UPDATE duels SET status = 'finished', winner_id = $2 WHERE id = $1 AND status = 'active'`,
        [duel.id, winner],
      );
      if (rowCount === 1 && winner) await awardXp(client, winner, DUEL_WIN_XP, 'duel', duel.id);
      return { ...duel, status: 'finished' as const, winner_id: winner };
    });
  }

  async function view(duel: DuelRow, viewer: string) {
    const settled = await settle(duel);
    const from = settled.starts_at;
    const to = settled.ends_at ? new Date(Math.min(settled.ends_at.getTime(), Date.now())) : null;
    const [challengerScore, opponentScore] =
      from && to
        ? await Promise.all([
            score(db, settled.metric, settled.challenger_id, from, to),
            score(db, settled.metric, settled.opponent_id, from, to),
          ])
        : [0, 0];
    const side = (prefix: 'challenger' | 'opponent', points: number) => ({
      id: settled[`${prefix}_id`],
      displayName: settled[`${prefix}_name`],
      avatarUrl: settled[`${prefix}_avatar`],
      level: settled[`${prefix}_level`],
      score: points,
    });
    return {
      id: settled.id,
      metric: settled.metric,
      days: settled.duration_days,
      status: settled.status,
      startsAt: settled.starts_at?.toISOString() ?? null,
      endsAt: settled.ends_at?.toISOString() ?? null,
      winnerId: settled.winner_id,
      createdAt: settled.created_at.toISOString(),
      isChallenger: settled.challenger_id === viewer,
      challenger: side('challenger', challengerScore),
      opponent: side('opponent', opponentScore),
      winXp: DUEL_WIN_XP,
    };
  }

  async function load(id: string) {
    const { rows } = await db.query<DuelRow>(`${SELECT} WHERE d.id = $1`, [id]);
    const duel = rows[0];
    if (!duel) throw notFound('Duel');
    return duel;
  }

  app.get('/v1/duels', { preHandler: auth.requireAuth }, async (request) => {
    const uid = userId(request);
    const { rows } = await db.query<DuelRow>(
      `${SELECT} WHERE (d.challenger_id = $1 OR d.opponent_id = $1)
         AND (d.status IN ('pending', 'active') OR d.created_at > now() - interval '60 days')
       ORDER BY (d.status = 'pending' AND d.opponent_id = $1) DESC, (d.status = 'active') DESC, d.created_at DESC LIMIT 50`,
      [uid],
    );
    return { duels: await Promise.all(rows.map((row) => view(row, uid))) };
  });

  app.post('/v1/duels', { preHandler: auth.requireAuth, config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (request, reply) => {
    const uid = userId(request);
    const body = parse(CreateDuelBody, request.body);
    if (body.opponentId === uid) throw badRequest('self_duel', 'You cannot challenge yourself');
    // Only friends (mutual follows) can be challenged.
    const { rows: friendRows } = await db.query<{ name: string }>(
      `SELECT me.display_name AS name FROM users me
       WHERE me.id = $1
         AND EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND followee_id = $2)
         AND EXISTS (SELECT 1 FROM follows WHERE follower_id = $2 AND followee_id = $1)`,
      [uid, body.opponentId],
    );
    if (!friendRows[0]) throw forbidden('You can only challenge friends (people who follow you back)');
    const { rows: open } = await db.query(
      `SELECT 1 FROM duels WHERE status IN ('pending', 'active')
         AND ((challenger_id = $1 AND opponent_id = $2) OR (challenger_id = $2 AND opponent_id = $1))`,
      [uid, body.opponentId],
    );
    if (open.length > 0) throw conflict('duel_exists', 'You already have an open challenge with this friend');

    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO duels (challenger_id, opponent_id, metric, duration_days) VALUES ($1, $2, $3, $4) RETURNING id`,
      [uid, body.opponentId, body.metric, body.days],
    );
    const name = friendRows[0].name;
    push.notify([body.opponentId], 'social', (lang) => ({ ...pushTexts(lang).duelInvite(name), url: '/duels' }));
    return reply.code(201).send({ duel: await view(await load(rows[0]!.id), uid) });
  });

  app.post('/v1/duels/:id/:action', { preHandler: auth.requireAuth }, async (request) => {
    const { id, action } = parse(z.object({ id: UuidSchema, action: z.enum(['accept', 'decline', 'cancel']) }), request.params);
    const uid = userId(request);
    const duel = await load(id);
    if (duel.status !== 'pending') throw conflict('not_pending', 'This challenge is no longer open');
    if (action === 'cancel') {
      if (duel.challenger_id !== uid) throw forbidden('Only the challenger can cancel');
      await db.query(`UPDATE duels SET status = 'cancelled' WHERE id = $1`, [id]);
    } else {
      if (duel.opponent_id !== uid) throw forbidden('Only the challenged friend can answer');
      if (action === 'decline') {
        await db.query(`UPDATE duels SET status = 'declined' WHERE id = $1`, [id]);
      } else {
        await db.query(
          `UPDATE duels SET status = 'active', starts_at = now(), ends_at = now() + make_interval(days => duration_days) WHERE id = $1`,
          [id],
        );
        push.notify([duel.challenger_id], 'social', (lang) => ({ ...pushTexts(lang).duelAccepted(duel.opponent_name), url: '/duels' }));
      }
    }
    return { duel: await view(await load(id), uid) };
  });
};
