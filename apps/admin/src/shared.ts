import { useQuery } from '@tanstack/react-query';

import { api } from './api.ts';
import type { Reference, StatsResponse } from './types.ts';

export type TabId = 'dashboard' | 'reports' | 'flagged' | 'posts' | 'users' | 'places' | 'challenges' | 'audit';

export function tabHref(id: TabId): string {
  return `#/${id}`;
}

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: () => api.get<StatsResponse>('/v1/admin/stats') });
}

export function useReference() {
  return useQuery({
    queryKey: ['reference'],
    queryFn: () => api.get<Reference>('/v1/admin/reference'),
    staleTime: 10 * 60_000,
  });
}
