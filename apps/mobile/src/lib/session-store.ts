import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'bc.refreshToken';

// SecureStore has no web implementation. The web build is a test preview, so the token lives in
// localStorage (survives reloads); browsers that block storage fall back to memory.
const memoryStore = new Map<string, string>();
const webStore = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memoryStore.set(key, value);
    }
  },
  delete(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memoryStore.delete(key);
    }
  },
};

export async function loadRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') return webStore.get(REFRESH_TOKEN_KEY);
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveRefreshToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (token) webStore.set(REFRESH_TOKEN_KEY, token);
    else webStore.delete(REFRESH_TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
