import type { Config } from '../config.js';
import type { DbClient } from '../db.js';

export type PushCategory = 'progress' | 'social' | 'newChallenges';

const PREF_COLUMN: Record<PushCategory, string> = {
  progress: 'notify_progress',
  social: 'notify_social',
  newChallenges: 'notify_new_challenges',
};

export interface PushMessage {
  title: string;
  body: string;
  /** Deep link path inside the app, e.g. "/challenge/<id>". */
  url?: string;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100;

interface WarnLogger {
  warn(details: object, message: string): void;
}

export function createPushService(config: Pick<Config, 'EXPO_ACCESS_TOKEN'>, db: DbClient, log: WarnLogger) {
  async function sendToTokens(tokens: string[], message: PushMessage) {
    for (let i = 0; i < tokens.length; i += BATCH) {
      const batch = tokens.slice(i, i + BATCH);
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(config.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${config.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(
          batch.map((to) => ({ to, title: message.title, body: message.body, sound: 'default', data: { url: message.url } })),
        ),
      });
      if (!response.ok) {
        log.warn({ status: response.status }, 'expo push request failed');
        continue;
      }
      const result = (await response.json()) as { data?: { status: string; details?: { error?: string } }[] };
      const dead = batch.filter((_, index) => result.data?.[index]?.details?.error === 'DeviceNotRegistered');
      if (dead.length > 0) await db.query('DELETE FROM push_tokens WHERE token = ANY($1)', [dead]);
    }
  }

  /** Fire-and-forget: never throws, never blocks the request that triggered it. */
  function notify(userIds: string[], category: PushCategory, message: PushMessage) {
    if (userIds.length === 0) return;
    void (async () => {
      const { rows } = await db.query<{ token: string }>(
        `SELECT t.token FROM push_tokens t JOIN users u ON u.id = t.user_id
         WHERE t.user_id = ANY($1::uuid[]) AND u.${PREF_COLUMN[category]} AND u.banned_at IS NULL`,
        [userIds],
      );
      await sendToTokens(
        rows.map((row) => row.token),
        message,
      );
    })().catch((error: unknown) => log.warn({ err: error }, 'push notify failed'));
  }

  return { notify, sendToTokens };
}

export type PushService = ReturnType<typeof createPushService>;
