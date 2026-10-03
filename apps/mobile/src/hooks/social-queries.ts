import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { api, uploadImage } from '@/lib/api';
import type {
  Comment,
  Country,
  Leaderboard,
  PlaceDetail,
  Post,
  PublicProfile,
  ReportReason,
  UserSummary,
  Visibility,
} from '@/lib/types';

const PAGE_SIZE = 20;

type PostPage = { posts: Post[] };

function usePostPages(key: unknown[], path: string, query: Record<string, string> = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: key,
    enabled,
    queryFn: ({ pageParam }) =>
      api<PostPage>(path, { query: { ...query, limit: PAGE_SIZE, before: pageParam ?? undefined } }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.posts.length < PAGE_SIZE ? null : last.posts.at(-1)!.createdAt),
    select: (data) => data.pages.flatMap((page) => page.posts),
  });
}

export type FeedScope = 'following' | 'friends' | 'nearby' | 'global';

export function useFeed(scope: FeedScope, near?: { lat: number; lng: number } | null) {
  // ~1 km rounding keeps the nearby feed from refetching on every GPS update.
  const lat = near ? (Math.round(near.lat * 100) / 100).toString() : undefined;
  const lng = near ? (Math.round(near.lng * 100) / 100).toString() : undefined;
  const query: Record<string, string> = { scope };
  if (scope === 'nearby' && lat && lng) Object.assign(query, { lat, lng });
  return usePostPages(['feed', scope, lat, lng], '/v1/feed', query, scope !== 'nearby' || Boolean(lat));
}
export const useUserPosts = (id: string) => usePostPages(['user-posts', id], `/v1/users/${id}/posts`);
export const useSavedPosts = () => usePostPages(['saved'], '/v1/me/saved');

export function usePost(id: string) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: () => api<{ post: Post }>(`/v1/posts/${id}`),
    select: (data) => data.post,
  });
}

/** Writes an updated post into every cached list so likes/saves feel instant everywhere. */
function useSyncPost() {
  const queryClient = useQueryClient();
  return (post: Post) => {
    queryClient.setQueryData<{ post: Post }>(['post', post.id], { post });
    for (const key of [['feed'], ['user-posts'], ['saved']]) {
      queryClient.setQueriesData<InfiniteData<PostPage>>({ queryKey: key }, (data) =>
        data && {
          ...data,
          pages: data.pages.map((page) => ({
            posts: page.posts.map((existing) => (existing.id === post.id ? post : existing)),
          })),
        },
      );
    }
  };
}

export function useToggleLike() {
  const sync = useSyncPost();
  return useMutation({
    mutationFn: (post: Post) =>
      api<{ post: Post }>(`/v1/posts/${post.id}/like`, { method: post.likedByMe ? 'DELETE' : 'POST' }),
    onMutate: (post) =>
      sync({ ...post, likedByMe: !post.likedByMe, likeCount: post.likeCount + (post.likedByMe ? -1 : 1) }),
    onSuccess: ({ post }) => sync(post),
    onError: (_error, post) => sync(post),
  });
}

export function useToggleSave() {
  const sync = useSyncPost();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (post: Post) =>
      api<{ post: Post }>(`/v1/posts/${post.id}/save`, { method: post.savedByMe ? 'DELETE' : 'POST' }),
    onMutate: (post) => sync({ ...post, savedByMe: !post.savedByMe }),
    onSuccess: ({ post }) => {
      sync(post);
      void queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
    onError: (_error, post) => sync(post),
  });
}

function useInvalidateSocial() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      ['feed', 'user-posts', 'saved', 'post', 'user', 'place', 'me', 'leaderboard', 'blocks'].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
}

export interface NewPost {
  kind?: Post['kind'];
  body: string;
  photoUris: string[];
  challengeId?: string;
  achievementId?: string;
  showLocation: boolean;
  visibility: Visibility;
}

export function useCreatePost() {
  const invalidate = useInvalidateSocial();
  return useMutation({
    mutationFn: async (input: NewPost) => {
      const photoIds: string[] = [];
      for (const uri of input.photoUris) {
        const { photo } = await uploadImage<{ photo: { id: string } }>('/v1/photos', uri);
        photoIds.push(photo.id);
      }
      return api<{ post: Post }>('/v1/posts', {
        method: 'POST',
        body: {
          kind: input.kind ?? (input.achievementId && !input.challengeId ? 'achievement' : 'adventure'),
          body: input.body,
          photoIds,
          challengeId: input.challengeId,
          achievementId: input.achievementId,
          showLocation: input.showLocation,
          visibility: input.visibility,
        },
      });
    },
    onSuccess: invalidate,
  });
}

export function useDeletePost() {
  const invalidate = useInvalidateSocial();
  return useMutation({
    mutationFn: (id: string) => api(`/v1/posts/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: () => api<{ comments: Comment[] }>(`/v1/posts/${postId}/comments`),
    select: (data) => data.comments,
  });
}

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api<{ comment: Comment }>(`/v1/posts/${postId}/comments`, { method: 'POST', body: { body } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => api(`/v1/comments/${commentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

export function usePublicProfile(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api<PublicProfile>(`/v1/users/${id}`),
  });
}

export function useFollow() {
  const invalidate = useInvalidateSocial();
  return useMutation({
    mutationFn: ({ id, follow }: { id: string; follow: boolean }) =>
      api(`/v1/users/${id}/follow`, { method: follow ? 'POST' : 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useBlock() {
  const invalidate = useInvalidateSocial();
  return useMutation({
    mutationFn: ({ id, block }: { id: string; block: boolean }) =>
      api(`/v1/users/${id}/block`, { method: block ? 'POST' : 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useBlockedUsers() {
  return useQuery({
    queryKey: ['blocks'],
    queryFn: () => api<{ users: UserSummary[] }>('/v1/me/blocks'),
    select: (data) => data.users,
  });
}

export function useFollowList(id: string, direction: 'followers' | 'following') {
  return useQuery({
    queryKey: ['user', id, direction],
    queryFn: () => api<{ users: UserSummary[] }>(`/v1/users/${id}/${direction}`),
    select: (data) => data.users,
  });
}

export function useUserSearch(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: ['user-search', trimmed],
    queryFn: () => api<{ users: UserSummary[] }>('/v1/users', { query: { q: trimmed } }),
    select: (data) => data.users,
    enabled: trimmed.length >= 2,
  });
}

export function useReport() {
  return useMutation({
    mutationFn: (report: {
      targetType: 'post' | 'comment' | 'user' | 'photo' | 'challenge';
      targetId: string;
      reason: ReportReason;
      details?: string;
    }) => api('/v1/reports', { method: 'POST', body: report }),
  });
}

export function useLeaderboard(scope: Leaderboard['scope'], period: Leaderboard['period'], country?: Country) {
  return useQuery({
    queryKey: ['leaderboard', scope, period, country],
    queryFn: () => api<Leaderboard>('/v1/leaderboards', { query: { scope, period, country } }),
  });
}

export function usePlace(id: string) {
  return useQuery({
    queryKey: ['place', id],
    queryFn: () => api<PlaceDetail>(`/v1/places/${encodeURIComponent(id)}`),
  });
}
