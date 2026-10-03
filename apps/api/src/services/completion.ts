import type { DbClient } from '../db.js';
import { findChallenges } from './challenges.js';
import { settleCommunityGoals } from './community.js';
import { touchStreak } from './goals.js';
import { awardXp, evaluateUnlocks, getLevelInfo, type UnlockedReward } from './progression.js';

export const DAILY_BONUS_XP = 50;

/** The daily pick is per user (their countries, not yet completed), so it must be resolved before completing. */
export async function todaysChallengeId(db: DbClient, userId: string): Promise<string | null> {
  const { rows } = await db.query<{ countries: string[] }>('SELECT countries::text[] AS countries FROM users WHERE id = $1', [
    userId,
  ]);
  const [daily] = await findChallenges(db, {
    userId,
    countries: rows[0]?.countries ?? [],
    status: 'uncompleted',
    sort: 'daily',
    limit: 1,
  });
  return daily?.id ?? null;
}

/**
 * Marks an attempt completed and pays out everything that follows from it. Must run inside a transaction.
 * Used by the live completion endpoint and by moderators approving a flagged completion.
 */
export async function finalizeCompletion(
  db: DbClient,
  params: { userId: string; attemptId: string; challengeId: string; xpReward: number; isDaily: boolean },
) {
  const { userId, attemptId, challengeId, xpReward, isDaily } = params;
  const before = await db.query<{ xp: number; level: number }>('SELECT xp, level FROM users WHERE id = $1', [userId]);

  await db.query(
    `UPDATE challenge_attempts SET status = 'completed', completed_at = coalesce(completed_at, now()), xp_awarded = $2
     WHERE id = $1`,
    [attemptId, xpReward],
  );
  await awardXp(db, userId, xpReward, 'challenge', challengeId);

  const bonuses: UnlockedReward[] = [];
  if (isDaily) {
    const { rows } = await db.query<{ day: string }>(
      `SELECT to_char(now() AT TIME ZONE 'Europe/Riga', 'YYYY-MM-DD') AS day`,
    );
    const { awarded } = await awardXp(db, userId, DAILY_BONUS_XP, 'daily', rows[0]!.day);
    if (awarded > 0) bonuses.push({ kind: 'daily', id: rows[0]!.day, title: "Today's challenge", icon: '☀️', xp: awarded });
  }

  const streak = await touchStreak(db, userId);
  // Before unlocks, so a reached community goal can unlock its badge right away.
  const communityReached = await settleCommunityGoals(db, userId);
  const unlocked = [...bonuses, ...(await evaluateUnlocks(db, userId))];

  const after = await db.query<{ xp: number }>('SELECT xp FROM users WHERE id = $1', [userId]);
  const level = await getLevelInfo(db, after.rows[0]!.xp);
  return {
    xpEarned: after.rows[0]!.xp - before.rows[0]!.xp,
    challengeXp: xpReward,
    leveledUp: level.level > before.rows[0]!.level,
    level,
    streak,
    unlocked,
    communityReached,
  };
}
