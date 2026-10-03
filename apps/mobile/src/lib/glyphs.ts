import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

/** Icon names from Material Community Icons, used for content (categories, badges, collections). */
export type GlyphName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const CATEGORY: Record<string, GlyphName> = {
  history: 'bank',
  castles: 'castle',
  manors: 'home-city-outline',
  churches: 'church',
  fortresses: 'shield-outline',
  'old-towns': 'city-variant-outline',
  monuments: 'pillar',
  museums: 'bank-outline',
  nature: 'pine-tree',
  forests: 'forest',
  'national-parks': 'nature',
  'nature-trails': 'hiking',
  waterfalls: 'waterfall',
  lakes: 'waves',
  rivers: 'waves',
  cliffs: 'image-filter-hdr',
  caves: 'terrain',
  bogs: 'grass',
  coast: 'waves',
  beaches: 'beach',
  lighthouses: 'lighthouse',
  piers: 'ferry',
  'coastal-trails': 'walk',
  'seaside-towns': 'sail-boat',
  adventure: 'compass-outline',
  hiking: 'hiking',
  cycling: 'bike',
  kayaking: 'kayaking',
  sup: 'surfing',
  climbing: 'carabiner',
  'long-routes': 'map-marker-path',
  photography: 'camera-outline',
  sunrise: 'weather-sunset-up',
  sunset: 'weather-sunset-down',
  viewpoints: 'binoculars',
  architecture: 'office-building-outline',
  wildlife: 'paw',
  landscapes: 'image-filter-hdr',
  bridges: 'bridge',
  food: 'silverware-fork-knife',
  cities: 'city-variant-outline',
  family: 'account-group-outline',
};

export function categoryGlyph(categoryId: string | null | undefined): GlyphName {
  return (categoryId && CATEGORY[categoryId]) || 'map-marker-outline';
}

const ACHIEVEMENT: Record<string, GlyphName> = {
  'first-step': 'shoe-print',
  'challenges-5': 'flag-outline',
  'challenges-10': 'flag-checkered',
  'challenges-25': 'medal-outline',
  'challenges-50': 'medal',
  'challenges-100': 'trophy',
  'castle-hunter': 'castle',
  'castle-master': 'chess-rook',
  'baltic-coast': 'waves',
  'road-warrior': 'car-outline',
  'three-nations': 'earth',
  'latvia-explorer': 'map-marker-star-outline',
  'lithuania-explorer': 'map-marker-star-outline',
  'estonia-explorer': 'map-marker-star-outline',
  'baltic-explorer': 'compass-outline',
  'streak-7': 'fire',
  'streak-30': 'fire-circle',
  'early-bird': 'weather-sunset-up',
  'night-explorer': 'weather-night',
  'weekly-warrior': 'calendar-star',
  'lighthouse-keeper': 'lighthouse',
  'nature-lover': 'pine-tree',
};

export function achievementGlyph(id: string): GlyphName {
  return ACHIEVEMENT[id] ?? 'medal-outline';
}

const GOAL: Record<string, GlyphName> = {
  'weekly-new-places': 'map-marker-plus-outline',
  'weekly-history': 'bank-outline',
  'monthly-explorer': 'trophy-outline',
  'monthly-regions': 'map-outline',
};

export function goalGlyph(slug: string): GlyphName {
  return GOAL[slug] ?? 'calendar-check-outline';
}

const COLLECTION: Record<string, GlyphName> = {
  'baltic-castles': 'castle',
  'baltic-coast': 'waves',
  'riga-highlights': 'city-variant-outline',
  'vilnius-highlights': 'city-variant-outline',
  'tallinn-highlights': 'city-variant-outline',
  'baltic-manors': 'home-city-outline',
  'sacred-places': 'church',
  'waterfalls-cliffs': 'waterfall',
  'baltic-lighthouses': 'lighthouse',
  'baltic-viewpoints': 'binoculars',
  'wild-nature': 'pine-tree',
  'baltic-trails': 'hiking',
};

export function collectionGlyph(slug: string): GlyphName {
  return COLLECTION[slug] ?? 'map-outline';
}

/** Reward rows on the completion screen. */
export function rewardGlyph(kind: string, id: string): GlyphName {
  if (kind === 'achievement') return achievementGlyph(id);
  if (kind === 'collection') return collectionGlyph(id);
  if (kind === 'goal') return goalGlyph(id);
  return 'white-balance-sunny';
}
