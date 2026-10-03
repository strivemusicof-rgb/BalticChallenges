import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Brand, Spacing } from '@/constants/theme';
import { formatNumber, levelTitle } from '@/lib/format';
import { useT } from '@/lib/i18n';
import type { LevelInfo } from '@/lib/types';

function greetingKey(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'greeting.night';
  if (hour < 12) return 'greeting.morning';
  if (hour < 18) return 'greeting.afternoon';
  return 'greeting.evening';
}

export function XpHeader({ name, avatarUrl, level }: { name: string; avatarUrl?: string | null; level: LevelInfo }) {
  const t = useT();
  const xpLabel = level.nextLevelXp
    ? t('common.xpProgress', { xp: formatNumber(level.xp), next: formatNumber(level.nextLevelXp) })
    : t('common.xpTotal', { xp: formatNumber(level.xp) });
  const firstName = name.split(/\s+/)[0] ?? name;
  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.navigate('/profile')} accessibilityRole="button" accessibilityLabel={t('tabs.profile')}>
        <Avatar name={name} url={avatarUrl ?? null} size={52} />
      </Pressable>
      <View style={styles.flex}>
        <ThemedText style={styles.greeting} numberOfLines={1}>
          {t(greetingKey(), { name: firstName })}
        </ThemedText>
        <ThemedText style={styles.level}>
          {t('common.levelTitle', { title: levelTitle(level.title), level: level.level })}
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
