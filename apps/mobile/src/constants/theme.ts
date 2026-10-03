import '@/global.css';

import { Platform } from 'react-native';

export const Brand = {
  /** Primary forest green: buttons, active tabs, selected states. */
  sea: '#1E5E46',
  /** Darker green for pressed states and dark surfaces. */
  seaDeep: '#123B2C',
  /** Soft green used behind icons and selected tiles. */
  mint: '#E7F2EC',
  amber: '#F2A33A',
  gold: '#E4A23B',
  forest: '#2E7D5B',
  danger: '#D64545',
  success: '#2E9E62',
  sky: '#2F7BD8',
} as const;

const light = {
  text: '#15211B',
  background: '#FFFFFF',
  backgroundElement: '#FFFFFF',
  backgroundSelected: '#EFF4F1',
  textSecondary: '#6B7A72',
  border: '#E6ECE8',
  tint: Brand.sea,
  xp: Brand.amber,
};

/** The app ships with a single light look (matches the product design). */
export const Colors = { light, dark: light } as const;

export type ThemeColor = keyof typeof light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 10,
  medium: 14,
  large: 18,
  pill: 999,
} as const;

/** The tab bar is laid out below the screens, so content needs no extra inset. */
export const BottomTabInset = 0;
export const MaxContentWidth = 640;

export const Shadow = {
  card: {
    shadowColor: '#0B2A1E',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#0B2A1E',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;
