import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/theme';

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Avatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (url) return <Image source={url} style={shape} contentFit="cover" accessibilityIgnoresInvertColors />;
  return (
    <View style={[shape, styles.fallback]}>
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
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
});
