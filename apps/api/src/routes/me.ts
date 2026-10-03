import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { userId } from '../auth/plugin.js';
import { withTransaction } from '../db.js';
import { AchievementRuleSchema, ruleProgress } from '../domain/achievements.js';
import { badRequest } from '../errors.js';
import { assertCleanText, CountrySchema, DifficultySchema, PageQuery, parse, type RoutePlugin } from '../http.js';
import { loadGoalProgress } from '../services/goals.js';
import { PHOTO_MAX_BYTES, processImage } from '../services/photos.js';
import { loadPosts } from '../services/posts.js';
import { loadProgress } from '../services/progression.js';
import { CURRENT_TERMS_VERSION, loadMe, loadStats } from '../services/users.js';
import { tr, type I18n } from '../i18n.js';

const INTERESTS = [
  'nature', 'history', 'food', 'hiking', 'architecture', 'beaches',
  'family', 'adventure', 'photography', 'wildlife', 'cycling', 'road-trips',
] as const;

const PatchMeBody = z
  .object({
    displayName: z.string().trim().min(1).max(40),
    bio: z.string().trim().max(300),
    interests: z.array(z.enum(INTERESTS)).max(INTERESTS.length),
    difficulty: DifficultySchema,
    countries: z.array(CountrySchema).min(1).max(3),
    profileVisibility: z.enum(['public', 'friends', 'private']),
    showPostLocation: z.boolean(),
    hideHomeArea: z.boolean(),
    notifications: z
      .object({ progress: z.boolean(), social: z.boolean(), newChallenges: z.boolean() })
      .partial()
      .strict(),
    completeOnboarding: z.literal(true),
    acceptTerms: z.literal(CURRENT_TERMS_VERSION),
  })
  .partial()
  .strict();

const PushTokenBody = z.object({
  token: z.string().min(10).max(200),
  platform: z.enum(['ios', 'android']),
});

export const meRoutes: RoutePlugin = (app, { db, auth, photos }) => {
  app.get('/v1/me', { preHandler: auth.requireAuth }, async (request) => {
    const uid = userId(request);
    const [user, stats] = await Promise.all([loadMe(db, uid), loadStats(db, uid)]);
    return { user, stats };
  });

  app.patch('/v1/me', { preHandler: auth.requireAuth }, async (request) => {
    const body = parse(PatchMeBody, request.body);
    assertCleanText('displayName', body.displayName);
    assertCleanText('bio', body.bio);
    const uid = userId(request);
    const sets: string[] = [];
    const params: unknown[] = [uid];
    const set = (column: string, value: unknown, cast = '') => {
      params.push(value);
      sets.push(`${column} = $${params.length}${cast}`);
    };
    if (body.displayName !== undefined) set('display_name', body.displayName);
    if (body.bio !== undefined) set('bio', body.bio);
    if (body.interests !== undefined) set('interests', [...new Set(body.interests)]);
    if (body.difficulty !== undefined) set('difficulty', body.difficulty, '::difficulty');
    if (body.countries !== undefined) set('countries', [...new Set(body.countries)], '::country_code[]');
    if (body.profileVisibility !== undefined) set('profile_visibility', body.profileVisibility, '::visibility');
    if (body.showPostLocation !== undefined) set('show_post_location', body.showPostLocation);
    if (body.hideHomeArea !== undefined) set('hide_home_area', body.hideHomeArea);
    if (body.notifications?.progress !== undefined) set('notify_progress', body.notifications.progress);
    if (body.notifications?.social !== undefined) set('notify_social', body.notifications.social);
    if (body.notifications?.newChallenges !== undefined) set('notify_new_challenges', body.notifications.newChallenges);
    if (body.completeOnboarding) sets.push('onboarded_at = coalesce(onboarded_at, now())');
    if (body.acceptTerms) {
      set('terms_version', body.acceptTerms);
      sets.push('terms_accepted_at = now()');
    }
    if (sets.length > 0) await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $1`, params);
    return { user: await loadMe(db, uid) };
  });

  // Account deletion is required by the App Store for apps with account creation.
  app.delete('/v1/me', { preHandler: auth.requireAuth }, async (request, reply) => {
    const uid = userId(request);
    const { avatar, photoKeys } = await withTransaction(db, async (client) => {
      const keys = await client.query<{ storage_key: string }>('SELECT storage_key FROM photos WHERE user_id = $1', [uid]);
      const { rows } = await client.query<{ avatar_url: string | null }>(
        'DELETE FROM users WHERE id = $1 RETURNING avatar_url',
        [uid],
      );
      return { avatar: rows[0]?.avatar_url ?? null, photoKeys: keys.rows.map((row) => row.storage_key) };
    });
    await photos.removeUrl(avatar);
    await Promise.all(photoKeys.map((key) => photos.removeKey(key)));
    return reply.code(204).send();
  });

  app.post(
    '/v1/me/avatar',
    { preHandler: auth.requireAuth, config: { rateLimit: { max: 10, timeWindow: '1 hour' } } },
    async (request) => {
      const uid = userId(request);
      const file = await request.file({ limits: { fileSize: PHOTO_MAX_BYTES, files: 1 } });
      if (!file) throw badRequest('missing_file', 'Upload an image in the "file" field');
      const buffer = await file.toBuffer();
      if (file.file.truncated) throw badRequest('file_too_large', 'Image must be 12 MB or smaller');
      const image = await processImage(buffer, 512);

      const storageKey = `avatars/${uid}/${randomUUID()}.jpg`;
      await photos.write(storageKey, image.data);
      const { rows } = await db.query<{ old: string | null }>(
        `UPDATE users u SET avatar_url = $2 FROM (SELECT avatar_url AS old FROM users WHERE id = $1) prev
         WHERE u.id = $1 RETURNING prev.old`,
        [uid, photos.urlFor(storageKey)],
      );
      await photos.removeUrl(rows[0]?.old ?? null);
      return { user: await loadMe(db, uid) };
    },
  );

  app.get('/v1/me/achievements', { preHandler: auth.requireAuth }, async (request) => {
    const uid = userId(request);
    const [achievements, unlocked, progress] = await Promise.all([
      db.query<{ id: string; title: string; description: string; icon: string; rule: unknown; xp_reward: number; is_hidden: boolean; i18n: I18n }>(
        `SELECT id, title, description, icon, rule, xp_reward, is_hidden, i18n FROM achievements WHERE status = 'published' ORDER BY sort`,
      ),
      db.query<{ achievement_id: string; unlocked_at: Date }>(
        'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = $1',
        [uid],
      ),
      loadProgress(db, uid),
    ]);
    const unlockedAt = new Map(unlocked.rows.map((row) => [row.achievement_id, row.unlocked_at]));
    return {
      achievements: achievements.rows
        .filter((row) => !row.is_hidden || unlockedAt.has(row.id))
        .map((row) => {
          const rule = AchievementRuleSchema.safeParse(row.rule);
          const ruleState = rule.success ? ruleProgress(rule.data, progress) : { current: 0, target: 1 };
          return {
            id: row.id,
            title: tr(row.i18n, 'title', row.title),
            description: tr(row.i18n, 'description', row.description),
            icon: row.icon,
            xpReward: row.xp_reward,
            unlockedAt: unlockedAt.get(row.id)?.toISOString() ?? null,
            progress: { current: Math.min(ruleState.current, ruleState.target), target: ruleState.target },
          };
        }),
    };
  });

  app.get('/v1/me/goals', { preHandler: auth.requireAuth }, async (request) => ({
    goals: await loadGoalProgress(db, userId(request)),
  }));

  app.get('/v1/me/history', { preHandler: auth.requireAuth }, async (request) => {
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }), request.query);
    const { rows } = await db.query(
      `SELECT ch.id AS "challengeId", ch.title, cat.icon, a.status, a.xp_awarded AS "xpAwarded",
              a.started_at AS "startedAt", a.completed_at AS "completedAt", p.name AS "placeName", p.city
       FROM challenge_attempts a
       JOIN challenges ch ON ch.id = a.challenge_id
       JOIN categories cat ON cat.id = ch.category_id
       LEFT JOIN places p ON p.id = ch.place_id
       WHERE a.user_id = $1
       ORDER BY coalesce(a.completed_at, a.started_at) DESC
       LIMIT $2`,
      [userId(request), limit],
    );
    return { history: rows };
  });

  app.get('/v1/me/saved', { preHandler: auth.requireAuth }, async (request) => {
    const page = parse(PageQuery, request.query);
    const uid = userId(request);
    return {
      posts: await loadPosts(db, photos, {
        viewerId: uid,
        savedBy: uid,
        before: page.before,
        limit: page.limit,
      }),
    };
  });

  app.get('/v1/me/blocks', { preHandler: auth.requireAuth }, async (request) => {
    const { rows } = await db.query(
      `SELECT u.id, u.display_name AS "displayName", u.avatar_url AS "avatarUrl", b.created_at AS "blockedAt"
       FROM blocks b JOIN users u ON u.id = b.blocked_id
       WHERE b.blocker_id = $1 ORDER BY b.created_at DESC`,
      [userId(request)],
    );
    return { users: rows };
  });

  app.put('/v1/me/push-tokens', { preHandler: auth.requireAuth }, async (request, reply) => {
    const body = parse(PushTokenBody, request.body);
    await db.query(
      `INSERT INTO push_tokens (token, user_id, platform) VALUES ($1, $2, $3)
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, last_seen_at = now()`,
      [body.token, userId(request), body.platform],
    );
    return reply.code(204).send();
  });

  app.delete('/v1/me/push-tokens/:token', { preHandler: auth.requireAuth }, async (request, reply) => {
    const { token } = parse(z.object({ token: z.string().min(10).max(200) }), request.params);
    await db.query('DELETE FROM push_tokens WHERE token = $1 AND user_id = $2', [token, userId(request)]);
    return reply.code(204).send();
  });
};
