import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, refreshSession, setSessionExpiredHandler, storeTokens } from '@/lib/api';
import { loadRefreshToken } from '@/lib/session-store';
import type { Session, User } from '@/lib/types';

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: User };

interface AuthContextValue {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithApple: (identityToken: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  const clearSession = useCallback(async () => {
    await storeTokens(null);
    queryClient.clear();
    setState({ status: 'signedOut', user: null });
  }, [queryClient]);

  useEffect(() => {
    setSessionExpiredHandler(() => void clearSession());
    (async () => {
      const hasToken = (await loadRefreshToken()) !== null;
      if (!hasToken || !(await refreshSession())) {
        setState({ status: 'signedOut', user: null });
        return;
      }
      try {
        const { user } = await api<{ user: User }>('/v1/me');
        setState({ status: 'signedIn', user });
      } catch {
        setState({ status: 'signedOut', user: null });
      }
    })();
    return () => setSessionExpiredHandler(null);
  }, [clearSession]);

  const acceptSession = useCallback(async (session: Session) => {
    await storeTokens(session.tokens);
    setState({ status: 'signedIn', user: session.user });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      signIn: async (email, password) =>
        acceptSession(await api<Session>('/v1/auth/login', { method: 'POST', body: { email, password }, auth: false })),
      register: async (email, password, displayName) =>
        acceptSession(
          await api<Session>('/v1/auth/register', {
            method: 'POST',
            body: { email, password, displayName },
            auth: false,
          }),
        ),
      signInWithApple: async (identityToken, fullName) =>
        acceptSession(
          await api<Session>('/v1/auth/apple', { method: 'POST', body: { identityToken, fullName }, auth: false }),
        ),
      signOut: async () => {
        const refreshToken = await loadRefreshToken();
        if (refreshToken) {
          await api('/v1/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(() => undefined);
        }
        await clearSession();
      },
      setUser: (user) => setState({ status: 'signedIn', user }),
    }),
    [state, acceptSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function useCurrentUser(): User {
  const { state } = useAuth();
  if (state.status !== 'signedIn') throw new Error('useCurrentUser requires a signed-in user');
  return state.user;
}
