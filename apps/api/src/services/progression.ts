import type { DbClient } from '../db.js';
import {
  AchievementRuleSchema,
  isRuleMet,
  type CompletionRecord,
  type PlayerProgress,
} from '../domain/achievements.js';
import { levelForXp, type LevelInfo, type LevelRow } from '../domain/levels.js';

import { loadGoalProgress } from './goals.js';

export type XpSource =
  | 'challenge'
  | 'achievement'
  | 'collection'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'goal'
  | 'streak'
  | 'admin';

let levelsCache: LevelRow[] | null = null;

export async function getLevels(db: DbClient): Promise<LevelRow[]> {
  if (!levelsCache) {
    const { rows } = await db.query<LevelRow>(
      'SELECT level, xp_required AS "xpRequired", title FROM levels ORDER BY level',
    );
    levelsCache = rows;
  }
  return levelsCache;
}

export async function getLevelInfo(db: DbClient, xp: number): Promise<LevelInfo> {
  return levelForXp(await getLevels(db), xp);
}

/** Idempotent: the same (source, sourceId) never pays out twice. */
export async function awardXp(
  db: DbClient,
  userId: string,
  amount: number,
  source: XpSource,
  sourceId: string,
): Promise<{ awarded: number; xp: number; level: number }> {
  const inserted = await db.query(
    `INSERT INTO xp_events (user_id, amount, source, source_id) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, source, source_id) DO NOTHING
     RETURNING id`,
    [userId, amount, source, sourceId],
  );
  const awarded = inserted.rowCount === 1 ? amount : 0;
  const { rows } = await db.query<{ xp: number }>(
    'UPDATE users SET xp = xp + $2 WHERE id = $1 RETURNING xp',
    [userId, awarded],
  );
  const xp = rows[0]!.xp;
  const { level } = await getLevelInfo(db, xp);
  await db.query('UPDATE users SET level = $2 WHERE id = $1 AND level <> $2', [userId, level]);
  return { awarded, xp, level };
}

export interface UnlockedReward {
  kind: 'achievement' | 'collection' | 'goal' | 'daily';
  id: string;
  title: string;
  icon: string;
  xp: number;
}

export async function loadProgress(db: DbClient, userId: string): Promise<PlayerProgress> {
  const [completions, collections, achievements, streak, goals] = await Promise.all([
    db.query<CompletionRecord>(
      `SELECT ch.category_id AS "categoryId", cat.parent_id AS "parentCategoryId",
              ch.country::text AS country, p.city,
              extract(hour FROM a.completed_at AT TIME ZONE 'Europe/Riga')::int AS "localHour"
       FROM challenge_attempts a
       JOIN challenges ch ON ch.id = a.challenge_id
       JOIN categories cat ON cat.id = ch.category_id
       LEFT JOIN places p ON p.id = ch.place_id
       WHERE a.user_id = $1 AND a.status = 'completed'`,
      [userId],
    ),
    db.query<{ slug: string }>(
      `SELECT c.slug FROM user_collections uc JOIN collections c ON c.id = uc.collection_id WHERE uc.user_id = $1`,
      [userId],
    ),
    db.query<{ id: string }>('SELECT achievement_id AS id FROM user_achievements WHERE user_id = $1', [userId]),
    db.query<{ longest_streak: number }>('SELECT longest_streak FROM user_streaks WHERE user_id = $1', [userId]),
    db.query<{ period: 'weekly' | 'monthly'; n: number }>(
      `SELECT g.period, count(*) AS n FROM user_goal_completions ugc
       JOIN goals g ON g.id = ugc.goal_id WHERE ugc.user_id = $1 GROUP BY g.period`,
      [userId],
    ),
  ]);
  const goalCounts = new Map(goals.rows.map((row) => [row.period, row.n]));
  return {
    completions: completions.rows,
    completedCollectionSlugs: new Set(collections.rows.map((row) => row.slug)),
    unlockedAchievementIds: new Set(achievements.rows.map((row) => row.id)),
    longestStreak: streak.rows[0]?.longest_streak ?? 0,
    goalsCompleted: { weekly: goalCounts.get('weekly') ?? 0, monthly: goalCounts.get('monthly') ?? 0 },
  };
}

async function completeGoals(db: DbClient, userId: string, unlocked: UnlockedReward[]): Promise<void> {
  for (const goal of await loadGoalProgress(db, userId)) {
    if (goal.completedAt || goal.current < goal.target) continue;
    const inserted = await db.query(
      'INSERT INTO user_goal_completions (user_id, goal_id, period_key) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [userId, goal.id, goal.periodKey],
    );
    if (inserted.rowCount !== 1) continue;
    if (goal.xpReward > 0) await awardXp(db, userId, goal.xpReward, 'goal', `${goal.id}:${goal.periodKey}`);
    unlocked.push({ kind: 'goal', id: goal.slug, title: goal.title, icon: goal.icon, xp: goal.xpReward });
  }
}

/**
 * Called inside the completion transaction. Completes any collections that are now full,
 * then unlocks achievements, repeating until nothing new unlocks (achievements can depend on other achievements).
 */
export async function evaluateUnlocks(db: DbClient, userId: string): Promise<UnlockedReward[]> {
  const unlocked: UnlockedReward[] = [];

  const finishedCollections = await db.query<{ id: string; slug: string; title: string; icon: string; xp_reward: number }>(
    `SELECT c.id, c.slug, c.title, c.icon, c.xp_reward
     FROM collections c
     WHERE c.status = 'published'
       AND NOT EXISTS (SELECT 1 FROM user_collections uc WHERE uc.user_id = $1 AND uc.collection_id = c.id)
       AND EXISTS (SELECT 1 FROM collection_items ci WHERE ci.collection_id = c.id)
       AND NOT EXISTS (
         SELECT 1 FROM collection_items ci
         WHERE ci.collection_id = c.id
           AND NOT EXISTS (
             SELECT 1 FROM challenge_attempts a
             WHERE a.user_id = $1 AND a.challenge_id = ci.challenge_id AND a.status = 'completed'))`,
    [userId],
  );
  for (const collection of finishedCollections.rows) {
    const inserted = await db.query(
      'INSERT INTO user_collections (user_id, collection_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, collection.id],
    );
    if (inserted.rowCount !== 1) continue;
    if (collection.xp_reward > 0) await awardXp(db, userId, collection.xp_reward, 'collection', collection.id);
    unlocked.push({
      kind: 'collection',
      id: collection.slug,
      title: collection.title,
      icon: collection.icon,
      xp: collection.xp_reward,
    });
  }

  await completeGoals(db, userId, unlocked);

  const progress = await loadProgress(db, userId);
  const candidates = await db.query<{ id: string; title: string; icon: string; rule: unknown; xp_reward: number }>(
    `SELECT id, title, icon, rule, xp_reward FROM achievements
     WHERE status = 'published'
       AND id NOT IN (SELECT achievement_id FROM user_achievements WHERE user_id = $1)
     ORDER BY sort`,
    [userId],
  );

  let remaining = candidates.rows;
  let changed = true;
  while (changed && remaining.length > 0) {
    changed = false;
    const stillLocked: typeof remaining = [];
    for (const achievement of remaining) {
      const rule = AchievementRuleSchema.safeParse(achievement.rule);
      if (!rule.success || !isRuleMet(rule.data, progress)) {
        stillLocked.push(achievement);
        continue;
      }
      await db.query(
        'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, achievement.id],
      );
      if (achievement.xp_reward > 0) await awardXp(db, userId, achievement.xp_reward, 'achievement', achievement.id);
      progress.unlockedAchievementIds.add(achievement.id);
      unlocked.push({
        kind: 'achievement',
        id: achievement.id,
        title: achievement.title,
        icon: achievement.icon,
        xp: achievement.xp_reward,
      });
      changed = true;
    }
    remaining = stillLocked;
  }

  return unlocked;
}
