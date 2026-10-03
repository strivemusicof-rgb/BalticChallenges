import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { api, ApiError, uploadImage } from '@/lib/api';
import type { RoutePoint } from '@/lib/route-recorder';

/**
 * Check-ins and routes recorded without a connection are kept here and sent when the phone is back online.
 * The server accepts the original GPS time for queued items (with review for late ones), so nothing is lost.
 */
export type QueuedItem =
  | {
      id: string;
      kind: 'complete';
      challengeId: string;
      challengeTitle: string;
      fix: { lat: number; lng: number; accuracyM: number; isMocked: boolean; recordedAt: string };
      photoUri: string | null;
    }
  | { id: string; kind: 'route'; challengeId: string; challengeTitle: string; points: RoutePoint[] };

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

const KEY = 'bc.offlineQueue';
let items: QueuedItem[] = [];
let loaded = false;
let flushing = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    items = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]') as QueuedItem[];
  } catch {
    items = [];
  }
  emit();
}

async function save() {
  await AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => undefined);
  emit();
}

/**
 * True for "no connection" failures, as opposed to the server answering with an error.
 * `api()` reports a request that never got an answer as status 0.
 */
export function isOfflineError(error: unknown): boolean {
  return error instanceof ApiError ? error.status === 0 : true;
}

export async function enqueue(item: WithoutId<QueuedItem>) {
  await load();
  items = [...items, { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` } as QueuedItem];
  await save();
}

/** Sends everything queued. Items the server answered (accepted or not) are removed; network failures stay. */
export async function flushQueue(): Promise<number> {
  await load();
  if (flushing || items.length === 0) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const item of [...items]) {
      try {
        if (item.kind === 'complete') {
          const photoId = item.photoUri
            ? (await uploadImage<{ photo: { id: string } }>('/v1/photos', item.photoUri)).photo.id
            : undefined;
          await api(`/v1/challenges/${item.challengeId}/complete`, {
            method: 'POST',
            body: { ...item.fix, photoId, offline: true },
          });
        } else {
          await api(`/v1/challenges/${item.challengeId}/route`, { method: 'POST', body: { points: item.points } });
        }
      } catch (error) {
        if (isOfflineError(error)) break; // still offline: try again later
      }
      items = items.filter((existing) => existing.id !== item.id);
      sent += 1;
      await save();
    }
  } finally {
    flushing = false;
  }
  return sent;
}

export function useQueuedItems(): QueuedItem[] {
  void load();
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => items,
    () => items,
  );
}
