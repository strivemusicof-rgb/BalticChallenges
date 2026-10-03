import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DialogHost } from '@/components/dialog-host';
import { Brand } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { currentLanguage, restoreLanguage } from '@/lib/i18n';
import { handleNotificationTaps, registerForPushNotifications } from '@/lib/notifications';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

SplashScreen.preventAutoHideAsync();

const NAV_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: Brand.sea, background: '#FFFFFF', card: '#FFFFFF', text: '#15211B', border: '#E6ECE8' },
};

const STACK_OPTIONS = {
  headerBackButtonDisplayMode: 'minimal' as const,
  headerTitleAlign: 'center' as const,
  headerShadowVisible: false,
  headerTintColor: '#15211B',
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 17 },
  headerStyle: { backgroundColor: '#FFFFFF' },
  contentStyle: { backgroundColor: '#FFFFFF' },
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
    },
  });
}

function RootNavigator() {
  const { state } = useAuth();
  const { t } = useTranslation();
  // Icons are drawn with fonts; load them before the first frame so they never flash as boxes.
  const [fontsLoaded, fontError] = useFonts({ ...Ionicons.font, ...MaterialCommunityIcons.font });
  const fontsReady = fontsLoaded || fontError !== null;
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    void restoreLanguage().finally(() => setLanguageReady(true));
  }, []);

  useEffect(() => {
    if (state.status !== 'loading' && fontsReady && languageReady) SplashScreen.hideAsync();
  }, [state.status, fontsReady, languageReady]);

  const signedIn = state.status === 'signedIn';
  const onboarded = signedIn && state.user.onboarded;
  const ready = onboarded && state.user.termsAccepted;

  // Keep the server's copy of the language in sync so push notifications arrive in it.
  useEffect(() => {
    if (!ready) return;
    api('/v1/me', { method: 'PATCH', body: { language: currentLanguage() } }).catch(() => undefined);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    registerForPushNotifications().catch(() => undefined);
    return handleNotificationTaps();
  }, [ready]);

  if (state.status === 'loading' || !fontsReady || !languageReady) return null;

  return (
    <Stack screenOptions={STACK_OPTIONS}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={onboarded && !ready}>
        <Stack.Screen name="terms" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={ready}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="challenge/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="collection/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="place/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="achievements" options={{ title: t('titles.achievements') }} />
        <Stack.Screen name="goals" options={{ title: t('titles.goals') }} />
        <Stack.Screen name="browse" options={{ title: t('titles.browse') }} />
        <Stack.Screen name="pro" options={{ title: t('titles.pro') }} />
        <Stack.Screen name="post/[id]" options={{ title: t('titles.post') }} />
        <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="new-post" options={{ title: t('titles.newPost') }} />
        <Stack.Screen name="settings" options={{ title: t('titles.settings') }} />
        <Stack.Screen name="history" options={{ title: t('titles.history') }} />
        <Stack.Screen name="saved" options={{ title: t('titles.saved') }} />
        <Stack.Screen name="blocked" options={{ title: t('titles.blocked') }} />
        <Stack.Screen name="leaderboard" options={{ title: t('titles.leaderboard') }} />
        <Stack.Screen name="people" options={{ title: t('titles.people') }} />
        <Stack.Screen name="follows" options={{ title: '' }} />
        <Stack.Screen name="admin/index" options={{ title: t('titles.admin') }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const { i18n } = useTranslation();
  const language = i18n.language;

  // Server-provided text (challenge titles, descriptions) is translated, so refetch it in the new language.
  useEffect(() => {
    void queryClient.invalidateQueries();
  }, [language, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NAV_THEME}>
        <AuthProvider>
          <RootNavigator key={language} />
          <DialogHost />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
