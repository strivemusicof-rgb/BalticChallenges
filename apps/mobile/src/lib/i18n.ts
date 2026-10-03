import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { getPref, setPref } from '@/lib/prefs';
import { en } from '@/locales/en';
import { lv } from '@/locales/lv';
import { ru } from '@/locales/ru';

export const LANGUAGES = [
  { code: 'lv', label: 'Latviešu' },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

const SUPPORTED = new Set<string>(LANGUAGES.map((language) => language.code));

/** Phone language if we support it; otherwise Latvian, the launch market. */
function deviceLanguage(): Language {
  for (const locale of getLocales()) {
    if (locale.languageCode && SUPPORTED.has(locale.languageCode)) return locale.languageCode as Language;
  }
  return 'lv';
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, lv: { translation: lv }, ru: { translation: ru } },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

/** Applies the language the user picked earlier (if any). Call once at startup. */
export async function restoreLanguage() {
  const saved = await getPref('language');
  if (saved && SUPPORTED.has(saved) && saved !== i18n.language) await i18n.changeLanguage(saved);
}

export async function setLanguage(language: Language) {
  await i18n.changeLanguage(language);
  await setPref('language', language);
}

export function currentLanguage(): Language {
  const language = i18n.language;
  return SUPPORTED.has(language) ? (language as Language) : 'en';
}

/** Translation hook used by every screen. */
export function useT() {
  return useTranslation().t;
}

export { i18n };
