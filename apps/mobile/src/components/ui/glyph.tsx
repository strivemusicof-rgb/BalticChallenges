import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import type { GlyphName } from '@/lib/glyphs';
import type { Country } from '@/lib/types';

/** Content icon (categories, badges, collections). */
export function Glyph({ name, size = 20, color }: { name: GlyphName; size?: number; color: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

const STRIPES: Record<Country, string[]> = {
  LV: ['#9E3039', '#9E3039', '#FFFFFF', '#9E3039', '#9E3039'],
  LT: ['#FDB913', '#006A44', '#C1272D'],
  EE: ['#0072CE', '#000000', '#FFFFFF'],
};

/** Small drawn national flag (emoji flags do not render on every platform). */
export function Flag({ country, width = 22 }: { country: Country; width?: number }) {
  const stripes = STRIPES[country];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.flag, { width, height: Math.round(width * 0.66) }]}>
      {stripes.map((color, index) => (
        <View key={index} style={[styles.stripe, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flag: {
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  stripe: {
    flex: 1,
  },
});
