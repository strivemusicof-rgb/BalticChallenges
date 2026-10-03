import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { HexBadge } from '@/components/ui/hex-badge';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Segmented } from '@/components/ui/segmented';
import { Brand, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAchievements } from '@/hooks/queries';
import type { Achievement } from '@/lib/types';

type Filter = 'all' | 'unlocked' | 'locked';
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unlocked', label: 'Unlocked' },
  { id: 'locked', label: 'Locked' },
] as const;

function AchievementRow({ achievement }: { achievement: Achievement }) {
  const unlocked = achievement.unlockedAt !== null;
  const { current, target } = achievement.progress;
  return (
    <PressableScale
      disabled={!unlocked}
      onPress={() =>
        router.push({ pathname: '/new-post', params: { achievementId: achievement.id, achievementTitle: achievement.title } })
      }
      accessibilityLabel={`${achievement.title}: ${achievement.description}${unlocked ? ', unlocked. Tap to share.' : ''}`}
      style={styles.row}>
      <HexBadge icon={achievement.icon} size={52} locked={!unlocked} />
      <View style={styles.flex}>
        <ThemedText style={styles.title}>{achievement.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {achievement.description}
        </ThemedText>
        {!unlocked && target > 1 && (
          <View style={styles.progress}>
            <ProgressBar progress={current / target} height={5} color={Brand.amber} />
          </View>
        )}
      </View>
      <ThemedText style={[styles.count, unlocked && { color: Brand.success }]}>
        {unlocked ? '✓' : target > 1 ? `${Math.min(current, target)}/${target}` : ''}
      </ThemedText>
    </PressableScale>
  );
}

export default function AchievementsScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const achievements = useAchievements();
  const all = achievements.data ?? [];
  const list = all.filter((item) => (filter === 'all' ? true : filter === 'unlocked' ? item.unlockedAt !== null : item.unlockedAt === null));
  const unlockedCount = all.filter((item) => item.unlockedAt !== null).length;

  return (
    <FlatList
      style={styles.screen}
      data={achievements.isSuccess ? list : []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <AchievementRow achievement={item} />}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.header}>
          <Segmented options={FILTERS} value={filter} onChange={setFilter} />
          {achievements.isSuccess && (
            <ThemedText type="small" themeColor="textSecondary">
              {unlockedCount} of {all.length} unlocked · tap an unlocked badge to share it
            </ThemedText>
          )}
        </View>
      }
      ListEmptyComponent={
        achievements.isPending ? (
          <LoadingState />
        ) : achievements.isError ? (
          <ErrorState error={achievements.error} onRetry={() => achievements.refetch()} />
        ) : (
          <EmptyState emoji="🏅" title={filter === 'unlocked' ? 'No badges yet' : 'All unlocked!'} />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFFFFF',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three + 4,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: '#FFFFFF',
    ...Shadow.card,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: 800,
  },
  progress: {
    marginTop: 6,
  },
  count: {
    fontSize: 14,
    fontWeight: 800,
    color: '#6B7A72',
  },
});
