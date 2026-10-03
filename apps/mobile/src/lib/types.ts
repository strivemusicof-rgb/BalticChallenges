export type Country = 'LV' | 'LT' | 'EE';
export type Difficulty = 'casual' | 'explorer' | 'adventurer' | 'extreme';

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  levelXp: number;
  nextLevelXp: number | null;
  progress: number;
}

export type Visibility = 'public' | 'friends' | 'private';

export interface Streak {
  current: number;
  longest: number;
}

export interface User {
  id: string;
  email: string | null;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  role: 'user' | 'moderator' | 'admin';
  difficulty: Difficulty;
  interests: string[];
  countries: Country[];
  profileVisibility: Visibility;
  showPostLocation: boolean;
  notifications: { progress: boolean; social: boolean; newChallenges: boolean };
  hideHomeArea: boolean;
  onboarded: boolean;
  termsAccepted: boolean;
  createdAt: string;
  level: LevelInfo;
  streak: Streak;
}

export interface Goal {
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

export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
}

export interface Post {
  id: string;
  kind: 'adventure' | 'achievement' | 'discovery' | 'route';
  body: string;
  createdAt: string;
  author: UserSummary;
  photos: { id: string; url: string; width: number | null; height: number | null }[];
  locationLabel: string | null;
  place: { id: string; name: string } | null;
  challenge: { id: string; title: string } | null;
  achievement: { id: string; title: string; icon: string } | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  isMine: boolean;
  visibility: Visibility;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  isMine: boolean;
  author: UserSummary;
}

export interface PublicProfile {
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    bio: string;
    level: LevelInfo;
    joinedAt: string;
    profileVisibility: Visibility;
  };
  relationship: {
    following: boolean;
    followsMe: boolean;
    blockedByMe: boolean;
    blockedMe: boolean;
    isFriend: boolean;
    isMe: boolean;
  };
  canView: boolean;
  stats: Stats | null;
  badges: { id: string; title: string; icon: string; unlockedAt: string }[];
}

export interface LeaderboardEntry extends UserSummary {
  score: number;
  rank: number;
}

export interface Leaderboard {
  scope: 'global' | 'friends' | 'country';
  period: 'week' | 'month' | 'all';
  country: Country | null;
  metric: 'xp' | 'challenges';
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}

export interface HistoryEntry {
  challengeId: string;
  title: string;
  icon: string;
  status: 'in_progress' | 'completed' | 'abandoned' | 'rejected' | 'flagged';
  xpAwarded: number | null;
  startedAt: string;
  completedAt: string | null;
  placeName: string | null;
  city: string | null;
}

export interface PlaceDetail {
  place: {
    id: string;
    slug: string;
    name: string;
    description: string;
    city: string | null;
    country: Country;
    lat: number;
    lng: number;
    images: string[];
    imageCredit: string | null;
    officialUrl: string | null;
    region: string | null;
    explorerCount: number;
    postCount: number;
    photoCount: number;
    challengeCount: number;
  };
  challenges: { id: string; slug: string; title: string; xpReward: number; difficulty: Difficulty; icon: string; categoryId: string; completed: boolean }[];
  posts: Post[];
}

export type ReportReason = 'spam' | 'abuse' | 'nudity' | 'violence' | 'fake_completion' | 'unsafe' | 'other';

export interface Tokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
}

export interface Session {
  user: User;
  tokens: Tokens;
}

export interface ChallengeSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  categoryId: string;
  categoryName: string;
  icon: string;
  country: Country | null;
  difficulty: Difficulty;
  xpReward: number;
  verification: string;
  isPro: boolean;
  endsAt: string | null;
  place: {
    id: string;
    name: string;
    city: string | null;
    lat: number;
    lng: number;
    radiusM: number;
  } | null;
  imageUrl: string | null;
  imageCredit: string | null;
  /** Players below this level cannot start the challenge. */
  minLevel: number;
  /** e.g. { distanceKm } for routes, { anyOrder } for visit-all challenges. */
  requirements: { distanceKm?: number; maxSpeedKmh?: number; anyOrder?: boolean };
  distanceM: number | null;
  userStatus: 'in_progress' | 'completed' | 'flagged' | null;
}

export interface ChallengeStep {
  id: string;
  position: number;
  title: string;
  placeId: string | null;
  lat: number;
  lng: number;
  radiusM: number;
  imageUrl: string | null;
  done: boolean;
}

export interface ChallengeDetail extends ChallengeSummary {
  explorers: number;
  /** Ordered checkpoints for trails; empty for single-place challenges. */
  steps: ChallengeStep[];
  collections: { slug: string; title: string; icon: string }[];
  images: string[];
  safety: {
    difficulty: Difficulty;
    terrain: string | null;
    accessibility: string | null;
    estimatedDurationMin: number | null;
    familyFriendly: boolean | null;
    dogFriendly: boolean | null;
    parking: boolean | null;
    seasonMonths: number[];
    officialUrl: string | null;
    temporarilyClosed: boolean;
    region: string | null;
  } | null;
}

export interface HomeFeed {
  me: Pick<User, 'displayName' | 'avatarUrl' | 'level' | 'onboarded' | 'streak'>;
  todaysChallenge: ChallengeSummary | null;
  dailyBonusXp: number;
  goals: Goal[];
  nearby: { radiusKm: number; count: number; challenges: ChallengeSummary[] };
  inProgress: ChallengeSummary[];
  recommended: ChallengeSummary[];
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  icon: string;
  challengeCount: number;
}

export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  kind: string;
  country: Country | null;
  xpReward: number;
  isPro: boolean;
  endsAt: string | null;
  total: number;
  completed: number;
  completedAt: string | null;
  imageUrl: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt: string | null;
  progress: { current: number; target: number };
}

export interface Stats {
  challengesCompleted: number;
  placesVisited: number;
  countriesVisited: number;
  achievementsUnlocked: number;
  collectionsCompleted: number;
  followers: number;
  following: number;
  photos: number;
  kmExplored: number;
  countryProgress: { country: Country; completed: number; total: number; percent: number }[];
}

export interface UnlockedReward {
  kind: 'achievement' | 'collection' | 'goal' | 'daily';
  id: string;
  title: string;
  icon: string;
  xp: number;
}

export type CompletionResult =
  | {
      status: 'completed';
      distanceM: number;
      xpEarned: number;
      challengeXp: number;
      leveledUp: boolean;
      level: LevelInfo;
      streak: number;
      unlocked: UnlockedReward[];
    }
  | { status: 'checkpoint'; stepsDone: number; totalSteps: number; distanceM: number }
  | { status: 'queued' }
  | { status: 'rejected' | 'flagged'; reason: string; message: string; distanceM: number };

export interface DuelSide extends UserSummary {
  score: number;
}

export interface Duel {
  id: string;
  metric: 'challenges' | 'xp' | 'places';
  days: number;
  status: 'pending' | 'active' | 'declined' | 'cancelled' | 'finished';
  startsAt: string | null;
  endsAt: string | null;
  winnerId: string | null;
  createdAt: string;
  isChallenger: boolean;
  challenger: DuelSide;
  opponent: DuelSide;
  winXp: number;
}
