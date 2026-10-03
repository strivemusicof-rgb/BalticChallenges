import type { Tokens } from './types.ts';

const REFRESH_KEY = 'bc-admin-refresh-token';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let onAuthLost: () => void = () => {};

export function setAuthLostHandler(handler: () => void) {
  onAuthLost = handler;
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_KEY);
}

export function setTokens(tokens: Tokens | null) {
  accessToken = tokens?.accessToken ?? null;
  if (tokens) sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  else sessionStorage.removeItem(REFRESH_KEY);
}

async function send(method: string, path: string, body: unknown, withAuth: boolean): Promise<Response> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (withAuth && accessToken) headers.authorization = `Bearer ${accessToken}`;
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  return fetch(path, init);
}

async function parse<T>(res: Response): Promise<T> {
  const text = res.status === 204 ? '' : await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (res.ok) throw new ApiError(res.status, 'bad_response', 'Server returned an invalid response');
    }
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown } } | undefined)?.error;
    throw new ApiError(res.status, err?.code ?? 'http_error', err?.message ?? `Request failed (${res.status})`, err?.details);
  }
  return data as T;
}

export function refreshTokens(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await send('POST', '/v1/auth/refresh', { refreshToken }, false);
      const data = await parse<{ tokens: Tokens }>(res);
      setTokens(data.tokens);
      return true;
    } catch (error) {
      if (error instanceof ApiError) setTokens(null);
      return false;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export async function request<T = void>(method: string, path: string, body?: unknown): Promise<T> {
  let res = await send(method, path, body, true);
  if (res.status === 401) {
    if (await refreshTokens()) {
      res = await send(method, path, body, true);
    }
    if (res.status === 401) {
      setTokens(null);
      onAuthLost();
    }
  }
  return parse<T>(res);
}

export async function requestPublic<T>(method: string, path: string, body?: unknown): Promise<T> {
  return parse<T>(await send(method, path, body, false));
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T = void>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T = void>(path: string, body: unknown) => request<T>('PATCH', path, body),
};

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const s = search.toString();
  return s ? `?${s}` : '';
}
