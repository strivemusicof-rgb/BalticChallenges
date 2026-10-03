import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Small persisted key/value store for user preferences (language and similar). */
export async function getPref(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return window.localStorage.getItem(`bc.${key}`);
    return await SecureStore.getItemAsync(`bc.${key}`);
  } catch {
    return null;
  }
}

export async function setPref(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') window.localStorage.setItem(`bc.${key}`, value);
    else await SecureStore.setItemAsync(`bc.${key}`, value);
  } catch {
    // Preferences are best effort; the app still works with defaults.
  }
}
