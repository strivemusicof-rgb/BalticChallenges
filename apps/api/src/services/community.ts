import type { DbClient } from '../db.js';
import { tr, type I18n } from '../i18n.js';
import { awardXp } from './progression.js';

/**
 * Community goals: a running seasonal event can carry one shared target ("together we complete 500
 * challenges"). Every completed challenge anywhere in the app during the event counts. When the target
 * is reached, everyone who took part gets the event's community XP, and so does anyone who joins later
 * while the event is still running.
 */
export interface CommunityGoalRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  i18n: I18n;
  starts_at: Date;
  ends_at: Date;
  community_goal: number;
  community_xp: number;
  community_reached_at: Date | null;
  progress: number;
  participants: number;
  mine: number;
}

/** Live events with a goal, with progress counted inside each event's dates. */
export async function liveCommunityGoals(db: DbClient, userId: string): Promise<CommunityGoalRow[]> {
  const { rows } = await db.query<CommunityGoalRow>(
    `SELECT c.id, c.slug, c.title, c.description, c.i18n, c.starts_at, c.ends_at,
            c.community_goal, c.community_xp, c.community_reached_at,
            s.progress, s.participants, s.mine
     FROM collections c
     CROSS JOIN LATERAL (
       SELECT count(*)::int AS progress,
              count(DISTINCT a.user_id)::int AS participants,
              count(*) FILTER (WHERE a.user_id = $1)::int AS mine
       FROM challenge_attempts a
       WHERE a.status = 'completed' AND a.completed_at >= c.starts_at AND a.completed_at < c.ends_at
     ) s
     WHERE c.kind = 'seasonal' AND c.status = 'published' AND c.community_goal > 0
       AND c.starts_at <= now() AND c.ends_at > now()
     ORDER BY c.ends_at`,
    [userId],
  );
  return rows;
}

export function communityGoalView(row: CommunityGoalRow) {
  return {
    slug: row.slug,
    title: tr(row.i18n, 'title', row.title),
    description: tr(row.i18n, 'description', row.description),
    goal: row.community_goal,
    progress: row.progress,
    participants: row.participants,
    mine: row.mine,
    rewardXp: row.community_xp,
    reachedAt: row.community_reached_at?.toISOString() ?? null,
    endsAt: row.ends_at.toISOString(),
  };
}

/**
 * Runs inside the completion transaction, after the attempt is marked completed.
 * Returns the events whose goal this completion just reached (for the celebration and the push).
 */
export async function settleCommunityGoals(db: DbClient, userId: string): Promise<{ slug: string; title: string; xp: number }[]> {
  const reached: { slug: string; title: string; xp: number }[] = [];
  for (const event of await liveCommunityGoals(db, userId)) {
    if (event.mine === 0) continue;
    if (event.community_reached_at) {
      if (event.community_xp > 0) await awardXp(db, userId, event.community_xp, 'community', event.id);
      continue;
    }
    if (event.progress < event.community_goal) continue;
    const { rowCount } = await db.query(
      'UPDATE collections SET community_reached_at = now() WHERE id = $1 AND community_reached_at IS NULL',
      [event.id],
    );
    if (rowCount !== 1) continue;
    const players = await communityParticipants(db, event.slug);
    if (event.community_xp > 0) {
      for (const player of players) await awardXp(db, player, event.community_xp, 'community', event.id);
    }
    reached.push({ slug: event.slug, title: tr(event.i18n, 'title', event.title), xp: event.community_xp });
  }
  return reached;
}

export async function communityParticipants(db: DbClient, slug: string): Promise<string[]> {
  const { rows } = await db.query<{ user_id: string }>(
    `SELECT DISTINCT a.user_id FROM challenge_attempts a
     JOIN collections c ON c.slug = $1
     WHERE a.status = 'completed' AND a.completed_at >= c.starts_at AND a.completed_at < c.ends_at`,
    [slug],
  );
  return rows.map((row) => row.user_id);
}
