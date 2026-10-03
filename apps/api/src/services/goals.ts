import { z } from 'zod';

import type { DbClient } from '../db.js';
import { tr, type I18n } from '../i18n.js';

export const GoalMetricSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('challenges_completed') }),
  z.object({ type: z.literal('new_places') }),
  z.object({ type: z.literal('category_completed'), category: z.string() }),
  z.object({ type: z.literal('regions_visited') }),
  z.object({ type: z.literal('countries_visited') }),
  z.object({ type: z.literal('xp_earned') }),
]);

export interface GoalProgress {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  period: 'weekly' | 'monthly';
  periodKey: string;
  endsAt: string;
  current: number;
  target: number;
  xpReward: number;
  completedAt: string | null;
}

interface Window {
  key: string;
  start: Date;
  end: Date;
}

interface CompletionInWindow {
  completed_at: Date;
  place_id: string | null;
  region_id: number | null;
  country: string | null;
  category_id: string;
  parent_id: string | null;
}

async function currentWindows(db: DbClient): Promise<{ weekly: Window; monthly: Window }> {
  // Periods follow the Riga calendar: ISO weeks starting Monday, calendar months.
  const { rows } = await db.query<{
    week_key: string;
    week_start: Date;
    week_end: Date;
    month_key: string;
    month_start: Date;
    month_end: Date;
  }>(`
    WITH local AS (SELECT (now() AT TIME ZONE 'Europe/Riga') AS t)
    SELECT to_char(t, 'IYYY-"W"IW') AS week_key,
           date_trunc('week', t) AT TIME ZONE 'Europe/Riga' AS week_start,
           (date_trunc('week', t) + interval '1 week') AT TIME ZONE 'Europe/Riga' AS week_end,
           to_char(t, 'YYYY-MM') AS month_key,
           date_trunc('month', t) AT TIME ZONE 'Europe/Riga' AS month_start,
           (date_trunc('month', t) + interval '1 month') AT TIME ZONE 'Europe/Riga' AS month_end
    FROM local`);
  const row = rows[0]!;
  return {
    weekly: { key: row.week_key, start: row.week_start, end: row.week_end },
    monthly: { key: row.month_key, start: row.month_start, end: row.month_end },
  };
}

function measure(
  metric: z.infer<typeof GoalMetricSchema>,
  completions: CompletionInWindow[],
  xpEarned: number,
): number {
  switch (metric.type) {
    case 'challenges_completed':
      return completions.length;
    case 'new_places':
      return new Set(completions.map((c) => c.place_id).filter(Boolean)).size;
    case 'category_completed':
      return completions.filter((c) => c.category_id === metric.category || c.parent_id === metric.category).length;
    case 'regions_visited':
      return new Set(completions.map((c) => c.region_id).filter((id) => id !== null)).size;
    case 'countries_visited':
      return new Set(completions.map((c) => c.country).filter(Boolean)).size;
    case 'xp_earned':
      return xpEarned;
  }
}

export async function loadGoalProgress(db: DbClient, userId: string): Promise<GoalProgress[]> {
  const windows = await currentWindows(db);
  const since = new Date(Math.min(windows.weekly.start.getTime(), windows.monthly.start.getTime()));

  const [goals, completions, xp, done] = await Promise.all([
    db.query<{
      id: string;
      slug: string;
      title: string;
      description: string;
      icon: string;
      period: 'weekly' | 'monthly';
      metric: unknown;
      target: number;
      xp_reward: number;
      i18n: I18n;
    }>(`SELECT id, slug, title, description, icon, period, metric, target, xp_reward, i18n
        FROM goals WHERE status = 'published' ORDER BY sort`),
    db.query<CompletionInWindow>(
      `SELECT a.completed_at, ch.place_id, coalesce(ch.region_id, p.region_id) AS region_id,
              ch.country::text AS country, ch.category_id, cat.parent_id
       FROM challenge_attempts a
       JOIN challenges ch ON ch.id = a.challenge_id
       JOIN categories cat ON cat.id = ch.category_id
       LEFT JOIN places p ON p.id = ch.place_id
       WHERE a.user_id = $1 AND a.status = 'completed' AND a.completed_at >= $2`,
      [userId, since],
    ),
    db.query<{ period: string; total: number }>(
      `SELECT 'weekly' AS period, coalesce(sum(amount), 0) AS total FROM xp_events
         WHERE user_id = $1 AND created_at >= $2 AND source <> 'goal'
       UNION ALL
       SELECT 'monthly', coalesce(sum(amount), 0) FROM xp_events
         WHERE user_id = $1 AND created_at >= $3 AND source <> 'goal'`,
      [userId, windows.weekly.start, windows.monthly.start],
    ),
    db.query<{ goal_id: string; period_key: string; completed_at: Date }>(
      'SELECT goal_id, period_key, completed_at FROM user_goal_completions WHERE user_id = $1 AND period_key IN ($2, $3)',
      [userId, windows.weekly.key, windows.monthly.key],
    ),
  ]);

  const xpBy = new Map(xp.rows.map((row) => [row.period, row.total]));
  const doneBy = new Map(done.rows.map((row) => [`${row.goal_id}:${row.period_key}`, row.completed_at]));

  return goals.rows.flatMap((goal) => {
    const metric = GoalMetricSchema.safeParse(goal.metric);
    if (!metric.success) return [];
    const window = windows[goal.period];
    const inWindow = completions.rows.filter(
      (c) => c.completed_at >= window.start && c.completed_at < window.end,
    );
    const current = measure(metric.data, inWindow, xpBy.get(goal.period) ?? 0);
    const completedAt = doneBy.get(`${goal.id}:${window.key}`) ?? null;
    return [
      {
        id: goal.id,
        slug: goal.slug,
        title: tr(goal.i18n, 'title', goal.title),
        description: tr(goal.i18n, 'description', goal.description),
        icon: goal.icon,
        period: goal.period,
        periodKey: window.key,
        endsAt: window.end.toISOString(),
        current: Math.min(current, goal.target),
        target: goal.target,
        xpReward: goal.xp_reward,
        completedAt: completedAt?.toISOString() ?? null,
      },
    ];
  });
}

export async function loadStreak(db: DbClient, userId: string) {
  const { rows } = await db.query<{ current_streak: number; longest_streak: number; active: boolean }>(
    `SELECT current_streak, longest_streak,
            last_active_day >= ((now() AT TIME ZONE 'Europe/Riga')::date - 1) AS active
     FROM user_streaks WHERE user_id = $1`,
    [userId],
  );
  const row = rows[0];
  // A streak survives until the end of the day after the last completion.
  return {
    current: row?.active ? row.current_streak : 0,
    longest: row?.longest_streak ?? 0,
  };
}

/** Advances the streak for a completion happening now. */
export async function touchStreak(db: DbClient, userId: string): Promise<number> {
  const { rows } = await db.query<{ current_streak: number }>(
    `WITH today AS (SELECT (now() AT TIME ZONE 'Europe/Riga')::date AS d)
     INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_day)
     SELECT $1, 1, 1, d FROM today
     ON CONFLICT (user_id) DO UPDATE SET
       current_streak = CASE
         WHEN user_streaks.last_active_day = (SELECT d FROM today) THEN user_streaks.current_streak
         WHEN user_streaks.last_active_day = (SELECT d FROM today) - 1 THEN user_streaks.current_streak + 1
         ELSE 1 END,
       longest_streak = greatest(user_streaks.longest_streak, CASE
         WHEN user_streaks.last_active_day = (SELECT d FROM today) THEN user_streaks.current_streak
         WHEN user_streaks.last_active_day = (SELECT d FROM today) - 1 THEN user_streaks.current_streak + 1
         ELSE 1 END),
       last_active_day = (SELECT d FROM today)
     RETURNING current_streak`,
    [userId],
  );
  return rows[0]!.current_streak;
}
