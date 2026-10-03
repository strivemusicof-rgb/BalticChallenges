import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Registers the Expo push token with the API. Only prompts for permission when `prompt` is set,
 * so the system dialog appears after a meaningful moment (the first completion), not on launch.
 * Silently does nothing on simulators, on web, or before the app is linked to an EAS project.
 */
export async function registerForPushNotifications({ prompt = false } = {}): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  const id = projectId();
  if (!id) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Baltic Challenges',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (!current.granted && !(prompt && current.canAskAgain)) return;
  const status = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!status.granted) return;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  await api('/v1/me/push-tokens', {
    method: 'PUT',
    body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
  });
}

/** Opens the deep link carried by a tapped notification. Returns an unsubscribe function. */
export function handleNotificationTaps(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
  });
  return () => subscription.remove();
}
