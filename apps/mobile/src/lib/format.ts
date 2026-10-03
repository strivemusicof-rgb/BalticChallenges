import type { Country, Difficulty } from '@/lib/types';

export function formatDistance(meters: number | null | undefined): string | null {
  if (meters === null || meters === undefined) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return meters < 10_000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters / 1000)} km`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** "3 days left" style countdown for weekly/monthly goals. */
export function timeLeft(iso: string, now = Date.now()): string {
  const hours = Math.max(0, Math.round((new Date(iso).getTime() - now) / 3_600_000));
  if (hours < 24) return `${hours} h left`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} left`;
}

export const INTEREST_OPTIONS = [
  { id: 'nature', label: '🌲 Nature' },
  { id: 'history', label: '🏰 History' },
  { id: 'food', label: '🍽️ Food' },
  { id: 'hiking', label: '🥾 Hiking' },
  { id: 'architecture', label: '🏛️ Architecture' },
  { id: 'beaches', label: '🏖️ Beaches' },
  { id: 'family', label: '👨‍👩‍👧 Family' },
  { id: 'adventure', label: '🧗 Adventure' },
  { id: 'photography', label: '📸 Photography' },
  { id: 'wildlife', label: '🦌 Wildlife' },
  { id: 'cycling', label: '🚴 Cycling' },
  { id: 'road-trips', label: '🚗 Road trips' },
] as const;

export const COUNTRY_LABELS: Record<Country, { flag: string; name: string }> = {
  LV: { flag: '🇱🇻', name: 'Latvia' },
  LT: { flag: '🇱🇹', name: 'Lithuania' },
  EE: { flag: '🇪🇪', name: 'Estonia' },
};

export const DIFFICULTY_LABELS: Record<Difficulty, { dot: string; name: string; blurb: string }> = {
  casual: { dot: '🟢', name: 'Casual', blurb: 'Easy visits, short walks, family friendly' },
  explorer: { dot: '🔵', name: 'Explorer', blurb: 'Day trips and moderate trails' },
  adventurer: { dot: '🟣', name: 'Adventurer', blurb: 'Longer routes and remote places' },
  extreme: { dot: '🔴', name: 'Extreme', blurb: 'Demanding hikes, rides and multi-day routes' },
};

const MARKER_COLORS = ['#1E5E46', '#2F7BD8', '#E8892C', '#D6493F', '#2A9D8F', '#7B5BD6', '#C9A227'];

/** Stable colour per category, used for map markers. */
export function categoryColor(categoryId: string): string {
  let hash = 0;
  for (const char of categoryId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return MARKER_COLORS[hash % MARKER_COLORS.length]!;
}
