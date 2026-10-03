import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Glyph } from '@/components/ui/glyph';
import { Brand } from '@/constants/theme';
import type { GlyphName } from '@/lib/glyphs';

interface PhotoProps {
  uri: string | null | undefined;
  /** Icon shown on a tinted background when there is no photo. */
  fallback?: GlyphName;
  /** Darken the bottom so white text on top stays readable. */
  shade?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function Photo({ uri, fallback = 'map-marker-outline', shade = false, style, children }: PhotoProps) {
  return (
    <View style={[styles.box, { backgroundColor: Brand.mint }, style]}>
      {uri ? (
        <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} cachePolicy="memory-disk" recyclingKey={uri} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: Brand.mint }]}>
          <Glyph name={fallback} size={34} color={Brand.sea} />
        </View>
      )}
      {shade && (
        <LinearGradient
          colors={['rgba(8,24,17,0)', 'rgba(8,24,17,0.78)']}
          locations={[0.35, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
