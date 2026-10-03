import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/theme';

interface PhotoProps {
  uri: string | null | undefined;
  /** Emoji shown on a tinted background when there is no photo. */
  fallback?: string;
  /** Darken the bottom so white text on top stays readable. */
  shade?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function Photo({ uri, fallback = '🧭', shade = false, style, children }: PhotoProps) {
  return (
    <View style={[styles.box, { backgroundColor: Brand.mint }, style]}>
      {uri ? (
        <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} cachePolicy="memory-disk" recyclingKey={uri} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback, { backgroundColor: Brand.mint }]}>
          <ThemedText style={styles.emoji}>{fallback}</ThemedText>
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
  emoji: {
    fontSize: 40,
    lineHeight: 52,
  },
});
