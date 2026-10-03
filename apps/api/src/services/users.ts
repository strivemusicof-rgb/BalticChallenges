import type { DbClient } from '../db.js';
import type { LevelInfo } from '../domain/levels.js';
import { notFound } from '../errors.js';
import { loadStreak } from './goals.js';
import { getLevelInfo } from './progression.js';

export const CURRENT_TERMS_VERSION = '2026-10-02';

export interface MeResponse {
  id: string;
  email: string | null;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  role: 'user' | 'moderator' | 'admin';
  difficulty: string;
  interests: string[];
  countries: string[];
  profileVisibility: string;
  showPostLocation: boolean;
  notifications: { progress: boolean; social: boolean; newChallenges: boolean };
  hideHomeArea: boolean;
  onboarded: boolean;
  termsAccepted: boolean;
  createdAt: string;
  level: LevelInfo;
  streak: { current: number; longest: number };
}

interface UserRow {
  id: string;
  email: string | null;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  role: MeResponse['role'];
  difficulty: string;
  interests: string[];
  countries: string[];
  profile_visibility: string;
  show_post_location: boolean;
  notify_progress: boolean;
  notify_social: boolean;
  notify_new_challenges: boolean;
  hide_home_area: boolean;
  onboarded_at: Date | null;
  terms_version: string | null;
  created_at: Date;
  xp: number;
}

export async function loadMe(db: DbClient, userId: string): Promise<MeResponse> {
  const { rows } = await db.query<UserRow>(
    `SELECT id, email, display_name, bio, avatar_url, role, difficulty, interests,
            countries::text[] AS countries, profile_visibility, show_post_location,
            notify_progress, notify_social, notify_new_challenges, hide_home_area,
            onboarded_at, terms_version, created_at, xp
     FROM users WHERE id = $1`,
    [userId],
  );
  const row = rows[0];
  if (!row) throw notFound('User');
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    role: row.role,
    difficulty: row.difficulty,
    interests: row.interests,
    countries: row.countries,
    profileVisibility: row.profile_visibility,
    showPostLocation: row.show_post_location,
    notifications: {
      progress: row.notify_progress,
      social: row.notify_social,
      newChallenges: row.notify_new_challenges,
    },
    hideHomeArea: row.hide_home_area,
    onboarded: row.onboarded_at !== null,
    termsAccepted: row.terms_version === CURRENT_TERMS_VERSION,
    createdAt: row.created_at.toISOString(),
    level: await getLevelInfo(db, row.xp),
    streak: await loadStreak(db, userId),
  };
}

export async function loadStats(db: DbClient, userId: string) {
  const { rows } = await db.query<{
    challenges_completed: number;
    places_visited: number;
    countries_visited: number;
    achievements: number;
    collections: number;
    followers: number;
    following: number;
    photos: number;
    km_explored: number;
  }>(
    `SELECT
       (SELECT count(*) FROM challenge_attempts WHERE user_id = $1 AND status = 'completed') AS challenges_completed,
       (SELECT count(DISTINCT ch.place_id) FROM challenge_attempts a JOIN challenges ch ON ch.id = a.challenge_id
          WHERE a.user_id = $1 AND a.status = 'completed' AND ch.place_id IS NOT NULL) AS places_visited,
       (SELECT count(DISTINCT ch.country) FROM challenge_attempts a JOIN challenges ch ON ch.id = a.challenge_id
          WHERE a.user_id = $1 AND a.status = 'completed') AS countries_visited,
       (SELECT count(*) FROM user_achievements WHERE user_id = $1) AS achievements,
       (SELECT count(*) FROM user_collections WHERE user_id = $1) AS collections,
       (SELECT count(*) FROM follows WHERE followee_id = $1) AS followers,
       (SELECT count(*) FROM follows WHERE follower_id = $1) AS following,
       (SELECT count(*) FROM photos WHERE user_id = $1 AND moderation = 'visible') AS photos,
       -- Straight-line distance between consecutive completed places, in completion order.
       (SELECT coalesce(round(sum(hop) / 1000), 0) FROM (
          SELECT ST_Distance(p.geog, lag(p.geog) OVER (ORDER BY a.completed_at)) AS hop
          FROM challenge_attempts a JOIN challenges ch ON ch.id = a.challenge_id JOIN places p ON p.id = ch.place_id
          WHERE a.user_id = $1 AND a.status = 'completed') hops) AS km_explored`,
    [userId],
  );
  const countries = await db.query<{ country: string; completed: number; total: number }>(
    `SELECT ch.country::text AS country,
            count(*) FILTER (WHERE a.id IS NOT NULL) AS completed,
            count(*) AS total
     FROM challenges ch
     LEFT JOIN challenge_attempts a ON a.challenge_id = ch.id AND a.user_id = $1 AND a.status = 'completed'
     WHERE ch.status = 'published' AND ch.country IS NOT NULL
     GROUP BY ch.country ORDER BY ch.country`,
    [userId],
  );
  const stats = rows[0]!;
  return {
    challengesCompleted: stats.challenges_completed,
    placesVisited: stats.places_visited,
    countriesVisited: stats.countries_visited,
    achievementsUnlocked: stats.achievements,
    collectionsCompleted: stats.collections,
    followers: stats.followers,
    following: stats.following,
    photos: stats.photos,
    kmExplored: Number(stats.km_explored),
    countryProgress: countries.rows.map((row) => ({
      country: row.country,
      completed: row.completed,
      total: row.total,
      percent: row.total === 0 ? 0 : Math.round((row.completed / row.total) * 100),
    })),
  };
}
