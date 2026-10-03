import * as WebBrowser from 'expo-web-browser';

import { API_URL } from '@/lib/api';

/** Must match CURRENT_TERMS_VERSION on the server; bumping it asks every user to accept again. */
export const TERMS_VERSION = '2026-10-02';

export const LEGAL_URLS = {
  terms: `${API_URL}/legal/terms`,
  privacy: `${API_URL}/legal/privacy`,
  support: `${API_URL}/legal/support`,
} as const;

export function openLegal(page: keyof typeof LEGAL_URLS) {
  void WebBrowser.openBrowserAsync(LEGAL_URLS[page]);
}
