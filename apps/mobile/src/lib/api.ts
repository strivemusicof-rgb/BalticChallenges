import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { currentLanguage } from '@/lib/i18n';
import { loadRefreshToken, saveRefreshToken } from '@/lib/session-store';
import type { Tokens } from '@/lib/types';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://vps-1a18ee51.vps.ovh.net').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export async function storeTokens(tokens: Tokens | null) {
  accessToken = tokens?.accessToken ?? null;
  await saveRefreshToken(tokens?.refreshToken ?? null);
}

/** Exchanges the stored refresh token for a new pair. Concurrent callers share one request. */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const refreshToken = await loadRefreshToken();
      if (!refreshToken) return false;
      const response = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        if (response.status === 401) await storeTokens(null);
        return false;
      }
      const body = (await response.json()) as { tokens: Tokens };
      await storeTokens(body.tokens);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Multipart upload; takes precedence over `body`. */
  form?: FormData;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
}

/** Uploads a local image (file:// URI) to an endpoint that expects a multipart "file" field. */
export async function uploadImage<T>(path: string, uri: string): Promise<T> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // On the web the picker returns a blob:/data: URL; send the actual bytes.
    form.append('file', await (await fetch(uri)).blob(), 'photo.jpg');
  } else {
    // Expo's fetch only reads real file objects; React Native's { uri, name, type } descriptors make it
    // throw before the request is sent (which looked like "no connection").
    form.append('file', new File(uri), 'photo.jpg');
  }
  return api<T>(path, { method: 'POST', form });
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, form, query, auth = true } = options;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const url = `${API_URL}${path}${search.size ? `?${search}` : ''}`;

  const send = () => {
    // The API returns challenge and place text in this language when a translation exists.
    const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Language': currentLanguage() };
    if (body !== undefined && !form) headers['Content-Type'] = 'application/json';
    if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(url, { method, headers, body: form ?? (body === undefined ? undefined : JSON.stringify(body)) });
  };

  let response: Response;
  try {
    response = await send();
  } catch {
    throw new ApiError(0, 'network', 'No connection to Baltic Challenges. Check your internet and try again.');
  }

  if (response.status === 401 && auth && (await refreshSession())) {
    response = await send();
  }
  if (response.status === 401 && auth) onSessionExpired?.();

  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: undefined })
    | { error: { code: string; message: string; details?: unknown } }
    | null;
  if (!response.ok || payload === null || payload.error) {
    const error = payload?.error;
    throw new ApiError(response.status, error?.code ?? 'unknown', error?.message ?? 'Something went wrong', error?.details);
  }
  return payload as T;
}
