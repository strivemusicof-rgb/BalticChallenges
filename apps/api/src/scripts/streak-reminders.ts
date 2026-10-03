/**
 * Evening progress reminders (systemd timer). Each opted-in player gets at most one progress push
 * per day, picked in priority order:
 *   1. streak ending at midnight (kept a streak yesterday, nothing today)
 *   2. a weekly goal that ends tomorrow and is already started
 *   3. close to the next level (sent once per level)
 */
import { createPool } from '../db.js';
import { loadGoalProgress } from '../services/goals.js';
import { createPushService, type PushMessage } from '../services/push.js';

const MIN_STREAK = 2;
const LEVEL_CLOSE_XP = 100;

type Kind = 'streak' | 'goal_ending' | 'level_close';

interface Reminder {
  kind: Kind;
  key: string;
  message: PushMessage;
}

const db = createPool(process.env.DATABASE_URL ?? '');
const push = createPushService({ EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN ?? '' }, db, {
  warn: (details, message) => console.warn(message, details),
});

async function streakReminders(): Promise<Map<string, Reminder>> {
  const { rows } = await db.query<{ user_id: string; current_streak: number; day: string }>(
    `SELECT s.user_id, s.current_streak, s.last_active_day::text AS day
     FROM user_streaks s
     WHERE s.last_active_day = (now() AT TIME ZONE 'Europe/Riga')::date - 1 AND s.current_streak >= $1`,
    [MIN_STREAK],
  );
  return new Map(
    rows.map((row) => [
      row.user_id,
      {
        kind: 'streak',
        key: row.day,
        message: {
          title: `🔥 Keep your ${row.current_streak}-day streak`,
          body: 'Complete any challenge before midnight to keep it going.',
          url: '/challenges',
        },
      },
    ]),
  );
}

async function goalEndingReminders(userIds: string[]): Promise<Map<string, Reminder>> {
  const { rows } = await db.query<{ last_day: boolean }>(
    `SELECT extract(isodow FROM now() AT TIME ZONE 'Europe/Riga') = 6 AS last_day`,
  );
  const result = new Map<string, Reminder>();
  if (!rows[0]?.last_day) return result;
  for (const userId of userIds) {
    const goal = (await loadGoalProgress(db, userId)).find(
      (g) => g.period === 'weekly' && !g.completedAt && g.current > 0 && g.current < g.target,
    );
    if (!goal) continue;
    result.set(userId, {
      kind: 'goal_ending',
      key: `${goal.slug}:${goal.periodKey}`,
      message: {
        title: `${goal.icon} ${goal.title} ends tomorrow`,
        body: `You're at ${goal.current}/${goal.target}. Finish it for +${goal.xpReward} XP.`,
        url: '/',
      },
    });
  }
  return result;
}

async function levelCloseReminders(): Promise<Map<string, Reminder>> {
  const { rows } = await db.query<{ user_id: string; next_level: number; missing: number }>(
    `SELECT u.id AS user_id, l.level AS next_level, l.xp_required - u.xp AS missing
     FROM users u JOIN levels l ON l.level = u.level + 1
     WHERE l.xp_required - u.xp BETWEEN 1 AND $1`,
    [LEVEL_CLOSE_XP],
  );
  return new Map(
    rows.map((row) => [
      row.user_id,
      {
        kind: 'level_close',
        key: String(row.next_level),
        message: {
          title: `⭐ ${row.missing} XP to Level ${row.next_level}`,
          body: 'One more challenge should do it.',
          url: '/challenges',
        },
      },
    ]),
  );
}

try {
  const { rows: eligible } = await db.query<{ user_id: string; token: string }>(
    `SELECT t.user_id, t.token
     FROM push_tokens t JOIN users u ON u.id = t.user_id
     WHERE u.notify_progress AND u.banned_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM push_reminders r
         WHERE r.user_id = u.id AND r.sent_at > now() - interval '20 hours'
       )`,
  );
  const tokensByUser = Map.groupBy(eligible, (row) => row.user_id);
  const userIds = [...tokensByUser.keys()];

  const { rows: sent } = await db.query<{ user_id: string; kind: Kind; key: string }>(
    'SELECT user_id, kind, key FROM push_reminders WHERE user_id = ANY($1::uuid[])',
    [userIds],
  );
  const alreadySent = new Set(sent.map((row) => `${row.user_id}:${row.kind}:${row.key}`));

  const sources = [await streakReminders(), await goalEndingReminders(userIds), await levelCloseReminders()];
  let delivered = 0;
  for (const userId of userIds) {
    const reminder = sources
      .map((source) => source.get(userId))
      .find((r) => r && !alreadySent.has(`${userId}:${r.kind}:${r.key}`));
    if (!reminder) continue;
    await db.query(
      'INSERT INTO push_reminders (user_id, kind, key) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [userId, reminder.kind, reminder.key],
    );
    await push.sendToTokens(
      tokensByUser.get(userId)!.map((row) => row.token),
      reminder.message,
    );
    delivered += 1;
  }
  console.log(`progress reminders sent to ${delivered} player(s)`);
} finally {
  await db.end();
}
