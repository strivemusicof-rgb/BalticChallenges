export type Role = 'user' | 'moderator' | 'admin';
export type Country = 'LV' | 'LT' | 'EE';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type Difficulty = 'casual' | 'explorer' | 'adventurer' | 'extreme';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}

export interface Tokens {
  accessToken: string;
  accessTokenExpiresAt?: string;
  refreshToken: string;
}

export interface StatsResponse {
  stats: {
    usersTotal: number;
    usersNew7d: number;
    activeUsers1d: number;
    activeUsers7d: number;
    completions1d: number;
    completions7d: number;
    inProgress: number;
    posts7d: number;
    openReports: number;
    flaggedCompletions: number;
    pendingPosts: number;
    publishedChallenges: number;
    publishedPlaces: number;
  };
  topChallenges: { id: string; title: string; completions: number }[];
  checkInRejections7d: { reason: string; n: number }[];
}

export type ReportStatus = 'open' | 'actioned' | 'dismissed';
export type ReportAction = 'dismiss' | 'hide_content' | 'restore_content' | 'ban_user';

export interface Report {
  id: string;
  targetType: 'post' | 'comment' | 'user' | 'photo' | 'check_in' | 'challenge';
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  resolutionNote: string | null;
  reporter: { id: string | null; displayName: string | null };
  reportCount: number;
  target: null | {
    authorId?: string;
    author?: string;
    body?: string;
    moderation?: string;
    photos?: string[];
    bannedAt?: string | null;
  };
}

export interface CheckIn {
  verdict: string;
  reason: string | null;
  distanceM: number | null;
  accuracyM: number | null;
  isMocked: boolean | null;
  deviceTime: string | null;
  receivedAt: string;
  lat: number;
  lng: number;
}

export interface FlaggedAttempt {
  attemptId: string;
  flaggedAt: string;
  user: { id: string; displayName: string; createdAt: string };
  challenge: { id: string; title: string; xpReward: number };
  checkIns: CheckIn[];
  userFlagCount: number;
}

export interface PendingPost {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  author: string;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  xp: number;
  level: number;
  createdAt: string;
  bannedAt: string | null;
  banReason: string | null;
  completions: number;
  flags: number;
  reports: number;
}

export interface Place {
  id: string;
  slug: string;
  name: string;
  description: string;
  country: Country;
  regionId: number | null;
  city: string | null;
  categoryId: string;
  lat: number;
  lng: number;
  radiusM: number;
  images: string[];
  difficulty: Difficulty;
  terrain: string | null;
  accessibility: string | null;
  seasonMonths: number[];
  estDurationMin: number | null;
  familyFriendly: boolean | null;
  dogFriendly: boolean | null;
  parking: boolean | null;
  officialUrl: string | null;
  temporarilyClosed: boolean;
  status: ContentStatus;
  challengeCount: number;
}

export const CHALLENGE_TYPES = [
  'visit', 'discover', 'photo', 'collection', 'route', 'multi_step', 'seasonal', 'social', 'time_limited',
] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

export const VERIFICATIONS = ['gps', 'gps_checkin', 'photo', 'gps_photo', 'route', 'manual'] as const;
export type Verification = (typeof VERIFICATIONS)[number];

export const DIFFICULTIES: Difficulty[] = ['casual', 'explorer', 'adventurer', 'extreme'];
export const COUNTRIES: Country[] = ['LV', 'LT', 'EE'];
export const STATUSES: ContentStatus[] = ['draft', 'published', 'archived'];

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: ChallengeType;
  categoryId: string;
  placeId: string | null;
  placeName: string | null;
  country: Country | null;
  regionId: number | null;
  difficulty: Difficulty;
  xpReward: number;
  verification: Verification;
  startsAt: string | null;
  endsAt: string | null;
  isPro: boolean;
  status: ContentStatus;
  completions: number;
}

export interface Reference {
  categories: { id: string; parentId: string | null; name: string; icon: string | null }[];
  regions: { id: number; country: Country; name: string }[];
}

export interface AuditEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  details: unknown;
  createdAt: string;
  actor: string | { id: string; displayName: string } | null;
}
