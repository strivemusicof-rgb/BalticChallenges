import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, getRefreshToken, refreshTokens, requestPublic, setAuthLostHandler, setTokens } from './api.ts';
import type { Tokens, User } from './types.ts';

type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous'; notice?: string }
  | { status: 'authenticated'; user: User };

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const NO_ACCESS_MESSAGE = 'This account has no admin access';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    setAuthLostHandler(() => setState({ status: 'anonymous', notice: 'Session expired, please sign in again.' }));

    let cancelled = false;
    (async () => {
      if (!getRefreshToken() || !(await refreshTokens())) {
        if (!cancelled) setState({ status: 'anonymous' });
        return;
      }
      try {
        const { user } = await api.get<{ user: User }>('/v1/me');
        if (cancelled) return;
        if (user.role === 'user') {
          setTokens(null);
          setState({ status: 'anonymous', notice: NO_ACCESS_MESSAGE });
        } else {
          setState({ status: 'authenticated', user });
        }
      } catch {
        if (!cancelled) setState({ status: 'anonymous' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user, tokens } = await requestPublic<{ user: User; tokens: Tokens }>('POST', '/v1/auth/login', {
      email,
      password,
    });
    if (user.role === 'user') {
      requestPublic('POST', '/v1/auth/logout', { refreshToken: tokens.refreshToken }).catch(() => {});
      throw new Error(NO_ACCESS_MESSAGE);
    }
    setTokens(tokens);
    setState({ status: 'authenticated', user });
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) await requestPublic('POST', '/v1/auth/logout', { refreshToken }).catch(() => {});
    setTokens(null);
    setState({ status: 'anonymous' });
  }, []);

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useCurrentUser(): User {
  const { state } = useAuth();
  if (state.status !== 'authenticated') throw new Error('Not authenticated');
  return state.user;
}

export function useIsAdmin(): boolean {
  return useCurrentUser().role === 'admin';
}
