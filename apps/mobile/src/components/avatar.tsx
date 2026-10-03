import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';
import { frameFor } from '@/lib/levels';

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Round avatar; pass `level` to draw the frame that level has unlocked (bronze from 5 up to diamond at 50). */
export function Avatar({ name, url, size = 40, level }: { name: string; url: string | null; size?: number; level?: number }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const face = url ? (
    <Image source={url} style={shape} contentFit="cover" accessibilityIgnoresInvertColors />
  ) : (
    <View style={[shape, styles.fallback]}>
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );

  const frame = frameFor(level);
  if (!frame) return face;
  const ring = Math.max(2, Math.round(size * 0.06));
  const outer = size + ring * 4;
  return (
    <LinearGradient
      colors={frame.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.frame, { width: outer, height: outer, borderRadius: outer / 2 }]}>
      <View style={[styles.gap, { padding: ring, borderRadius: (size + ring * 2) / 2 }]}>{face}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: Brand.sea,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: 700,
  },
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gap: {
    backgroundColor: '#FFFFFF',
  },
});
