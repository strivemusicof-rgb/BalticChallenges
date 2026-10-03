import { currentLanguage, i18n } from '@/lib/i18n';
import type { Country, Difficulty } from '@/lib/types';

export function formatDistance(meters: number | null | undefined): string | null {
  if (meters === null || meters === undefined) return null;
  const km = currentLanguage() === 'ru' ? 'км' : 'km';
  const m = currentLanguage() === 'ru' ? 'м' : 'm';
  if (meters < 1000) return `${Math.round(meters)} ${m}`;
  const value = meters < 10_000 ? (meters / 1000).toFixed(1) : String(Math.round(meters / 1000));
  return `${currentLanguage() === 'en' ? value : value.replace('.', ',')} ${km}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString(currentLanguage() === 'en' ? 'en-GB' : currentLanguage());
}

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return i18n.t('time.justNow');
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return i18n.t('time.minAgo', { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return i18n.t('time.hAgo', { count: hours });
  const days = Math.round(hours / 24);
  if (days < 7) return i18n.t('time.dAgo', { count: days });
  return new Date(iso).toLocaleDateString(currentLanguage(), { day: 'numeric', month: 'short' });
}

/** "3 days left" style countdown for weekly/monthly goals. */
export function timeLeft(iso: string, now = Date.now()): string {
  const hours = Math.max(0, Math.round((new Date(iso).getTime() - now) / 3_600_000));
  if (hours < 24) return i18n.t('time.hLeft', { count: hours });
  return i18n.t('time.dLeft', { count: Math.round(hours / 24) });
}

/** Short month name (1-12) in the current language. */
export function monthName(month: number): string {
  return new Date(2024, month - 1, 1).toLocaleString(currentLanguage(), { month: 'short' });
}

/** Level titles come from the server in English; show the translated one. */
export function levelTitle(title: string): string {
  return i18n.t(`levels.${title}`, { defaultValue: title });
}

export const INTEREST_IDS = [
  'nature',
  'history',
  'food',
  'hiking',
  'architecture',
  'beaches',
  'family',
  'adventure',
  'photography',
  'wildlife',
  'cycling',
  'road-trips',
] as const;

export const COUNTRIES: Country[] = ['LV', 'LT', 'EE'];

export const DIFFICULTIES: Difficulty[] = ['casual', 'explorer', 'adventurer', 'extreme'];

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  casual: '#2E9E62',
  explorer: '#2F7BD8',
  adventurer: '#7B5BD6',
  extreme: '#D6493F',
};

const MARKER_COLORS = ['#1E5E46', '#2F7BD8', '#E8892C', '#D6493F', '#2A9D8F', '#7B5BD6', '#C9A227'];

/** Stable colour per category, used for map markers. */
export function categoryColor(categoryId: string): string {
  let hash = 0;
  for (const char of categoryId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return MARKER_COLORS[hash % MARKER_COLORS.length]!;
}
