import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Brand, Spacing } from '@/constants/theme';
import type { LevelInfo } from '@/lib/types';

function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function XpHeader({ name, avatarUrl, level }: { name: string; avatarUrl?: string | null; level: LevelInfo }) {
  const xpLabel = level.nextLevelXp
    ? `${level.xp.toLocaleString()} / ${level.nextLevelXp.toLocaleString()} XP`
    : `${level.xp.toLocaleString()} XP`;
  const firstName = name.split(/\s+/)[0] ?? name;
  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.navigate('/profile')} accessibilityRole="button" accessibilityLabel="Your profile">
        <Avatar name={name} url={avatarUrl ?? null} size={52} />
      </Pressable>
      <View style={styles.flex}>
        <ThemedText style={styles.greeting} numberOfLines={1}>
          {greeting()}, {firstName} 👋
        </ThemedText>
        <ThemedText style={styles.level}>
          LVL {level.level} {level.title}
        </ThemedText>
        <View style={styles.barRow}>
          <View style={styles.flex}>
            <ProgressBar progress={level.progress} height={6} />
          </View>
          <ThemedText style={styles.xp}>{xpLabel}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  greeting: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: 800,
  },
  level: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 600,
    color: Brand.sea,
    marginBottom: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  xp: {
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7A72',
  },
});
