import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getVerificationFix, type Coordinates } from '@/hooks/use-location';
import { api, uploadImage } from '@/lib/api';
import { enqueue, isOfflineError } from '@/lib/offline-queue';
import type { RoutePoint } from '@/lib/route-recorder';
import type { Achievement, Category, ChallengeDetail, ChallengeSummary, Collection, CommunityGoal, CompletionResult, Goal, HistoryEntry, HomeFeed, Stats, User } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

const roundCoord = (value: number | undefined) => (value === undefined ? undefined : Math.round(value * 1000) / 1000);

export function useHomeFeed(coords: Coordinates | null) {
  // ~100 m rounding keeps the query key stable while the user stands still.
  const lat = roundCoord(coords?.lat);
  const lng = roundCoord(coords?.lng);
  return useQuery({
    queryKey: ['home', lat, lng],
    queryFn: () => api<HomeFeed>('/v1/home', { query: { lat, lng } }),
  });
}

export interface ChallengeFilters {
  coords?: Coordinates | null;
  radiusKm?: number;
  category?: string;
  country?: string;
  status?: 'completed' | 'uncompleted' | 'in_progress';
  q?: string;
  limit?: number;
}

export function useChallenges(filters: ChallengeFilters) {
  const { coords, ...rest } = filters;
  const query = { ...rest, lat: roundCoord(coords?.lat), lng: roundCoord(coords?.lng) };
  return useQuery({
    queryKey: ['challenges', query],
    queryFn: () => api<{ challenges: ChallengeSummary[] }>('/v1/challenges', { query }),
    select: (data) => data.challenges,
  });
}

export function useChallenge(id: string) {
  return useQuery({
    queryKey: ['challenge', id],
    queryFn: () => api<{ challenge: ChallengeDetail }>(`/v1/challenges/${encodeURIComponent(id)}`),
    select: (data) => data.challenge,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api<{ categories: Category[] }>('/v1/categories', { auth: false }),
    select: (data) => data.categories,
    staleTime: 60 * 60 * 1000,
  });
}

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: () => api<{ collections: Collection[] }>('/v1/collections'),
    select: (data) => data.collections,
  });
}

/** Shared goals of the running events; refreshed after every completion. */
export function useCommunityGoals() {
  return useQuery({
    queryKey: ['community'],
    queryFn: () => api<{ goals: CommunityGoal[] }>('/v1/community'),
    select: (data) => data.goals,
    staleTime: 60_000,
  });
}

export function useCollection(slug: string) {
  return useQuery({
    queryKey: ['collection', slug],
    queryFn: () => api<{ collection: Collection & { challenges: ChallengeSummary[] } }>(`/v1/collections/${slug}`),
    select: (data) => data.collection,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ user: User; stats: Stats }>('/v1/me'),
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: () => api<{ achievements: Achievement[] }>('/v1/me/achievements'),
    select: (data) => data.achievements,
  });
}

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => api<{ goals: Goal[] }>('/v1/me/goals'),
    select: (data) => data.goals,
  });
}

export function useHistory() {
  return useQuery({
    queryKey: ['history'],
    queryFn: () => api<{ history: HistoryEntry[] }>('/v1/me/history', { query: { limit: 100 } }),
    select: (data) => data.history,
  });
}

export type ProfilePatch = Partial<
  Pick<User, 'displayName' | 'bio' | 'interests' | 'difficulty' | 'countries' | 'profileVisibility' | 'showPostLocation' | 'hideHomeArea'>
> & {
  notifications?: Partial<User['notifications']>;
  completeOnboarding?: true;
  acceptTerms?: string;
};

/** Saves profile changes and pushes the fresh user into the auth state so guards and headers update. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => api<{ user: User }>('/v1/me', { method: 'PATCH', body: patch }),
    onSuccess: ({ user }) => {
      setUser(user);
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      void queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: (uri: string) => uploadImage<{ user: User }>('/v1/me/avatar', uri),
    onSuccess: ({ user }) => {
      setUser(user);
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

function useInvalidateProgress() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      ['home', 'challenges', 'challenge', 'collections', 'collection', 'me', 'achievements', 'goals', 'history', 'community'].map(
        (key) => queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
}

export function useStartChallenge(id: string) {
  const invalidate = useInvalidateProgress();
  return useMutation({
    mutationFn: () => api(`/v1/challenges/${id}/start`, { method: 'POST', body: {} }),
    onSuccess: invalidate,
  });
}

export function useCompleteChallenge(id: string) {
  const invalidate = useInvalidateProgress();
  return useMutation({
    mutationFn: async ({ photoUri, title = '' }: { photoUri?: string | null; title?: string } = {}): Promise<CompletionResult> => {
      const fix = await getVerificationFix();
      try {
        // The photo is proof; upload it first so the completion can reference it.
        const photoId = photoUri ? (await uploadImage<{ photo: { id: string } }>('/v1/photos', photoUri)).photo.id : undefined;
        return await api<CompletionResult>(`/v1/challenges/${id}/complete`, { method: 'POST', body: { ...fix, photoId } });
      } catch (error) {
        // No connection: keep the GPS fix (and photo) and send it when the phone is back online.
        if (!isOfflineError(error)) throw error;
        await enqueue({ kind: 'complete', challengeId: id, challengeTitle: title, fix, photoUri: photoUri ?? null });
        return { status: 'queued' };
      }
    },
    onSuccess: invalidate,
  });
}

export function useSubmitRoute(id: string) {
  const invalidate = useInvalidateProgress();
  return useMutation({
    mutationFn: async ({ points, title = '' }: { points: RoutePoint[]; title?: string }): Promise<CompletionResult> => {
      try {
        return await api<CompletionResult>(`/v1/challenges/${id}/route`, { method: 'POST', body: { points } });
      } catch (error) {
        if (!isOfflineError(error)) throw error;
        await enqueue({ kind: 'route', challengeId: id, challengeTitle: title, points });
        return { status: 'queued' };
      }
    },
    onSuccess: invalidate,
  });
}

export function useAbandonChallenge(id: string) {
  const invalidate = useInvalidateProgress();
  return useMutation({
    mutationFn: () => api(`/v1/challenges/${id}/abandon`, { method: 'POST', body: {} }),
    onSuccess: invalidate,
  });
}
