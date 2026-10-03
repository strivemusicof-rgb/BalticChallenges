import type { GlyphName } from '@/lib/glyphs';

export interface Frame {
  level: number;
  key: 'bronze' | 'silver' | 'gold' | 'emerald' | 'diamond';
  colors: [string, string];
}

/** Avatar frames, unlocked by level. */
export const FRAMES: Frame[] = [
  { level: 5, key: 'bronze', colors: ['#B87333', '#E0A36A'] },
  { level: 10, key: 'silver', colors: ['#8E9AA3', '#DDE3E7'] },
  { level: 20, key: 'gold', colors: ['#C9901C', '#F6D365'] },
  { level: 30, key: 'emerald', colors: ['#0F7A4F', '#4ADE80'] },
  { level: 50, key: 'diamond', colors: ['#3B82F6', '#A5F3FC'] },
];

export function frameFor(level: number | undefined): Frame | null {
  if (!level) return null;
  return [...FRAMES].reverse().find((frame) => level >= frame.level) ?? null;
}

export interface LevelReward {
  level: number;
  glyph: GlyphName;
  /** i18n key under levelRewards.* */
  key: string;
  frame?: Frame;
}

/** Everything a level unlocks, in order. Shown on the Level rewards screen. */
export const LEVEL_REWARDS: LevelReward[] = [
  { level: 5, glyph: 'circle-outline', key: 'frame', frame: FRAMES[0] },
  { level: 5, glyph: 'chart-box-outline', key: 'stats' },
  { level: 10, glyph: 'circle-outline', key: 'frame', frame: FRAMES[1] },
  { level: 10, glyph: 'star-shooting-outline', key: 'special' },
  { level: 20, glyph: 'circle-outline', key: 'frame', frame: FRAMES[2] },
  { level: 30, glyph: 'circle-outline', key: 'frame', frame: FRAMES[3] },
  { level: 50, glyph: 'circle-outline', key: 'frame', frame: FRAMES[4] },
  { level: 50, glyph: 'crown-outline', key: 'master' },
];

/** Extra statistics on the profile unlock at this level. */
export const STATS_LEVEL = 5;
