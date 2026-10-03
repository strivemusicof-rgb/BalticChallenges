import Ionicons from '@expo/vector-icons/Ionicons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { DialogHost } from '@/components/dialog-host';
import { Brand } from '@/constants/theme';
import { ApiError } from '@/lib/api';
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
  // Icons are drawn with a font; load it before the first frame so they never flash as boxes.
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  const fontsReady = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (state.status !== 'loading' && fontsReady) SplashScreen.hideAsync();
  }, [state.status, fontsReady]);

  const signedIn = state.status === 'signedIn';
  const onboarded = signedIn && state.user.onboarded;
  const ready = onboarded && state.user.termsAccepted;

  useEffect(() => {
    if (!ready) return;
    registerForPushNotifications().catch(() => undefined);
    return handleNotificationTaps();
  }, [ready]);

  if (state.status === 'loading' || !fontsReady) return null;

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
        <Stack.Screen name="achievements" options={{ title: 'Achievements' }} />
        <Stack.Screen name="goals" options={{ title: 'Challenges' }} />
        <Stack.Screen name="browse" options={{ title: 'All challenges' }} />
        <Stack.Screen name="pro" options={{ title: 'Pro Subscription' }} />
        <Stack.Screen name="post/[id]" options={{ title: 'Post' }} />
        <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="new-post" options={{ title: 'Create Post' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="history" options={{ title: 'History' }} />
        <Stack.Screen name="saved" options={{ title: 'Saved' }} />
        <Stack.Screen name="blocked" options={{ title: 'Blocked people' }} />
        <Stack.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
        <Stack.Screen name="people" options={{ title: 'Find people' }} />
        <Stack.Screen name="follows" options={{ title: '' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NAV_THEME}>
        <AuthProvider>
          <RootNavigator />
          <DialogHost />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
