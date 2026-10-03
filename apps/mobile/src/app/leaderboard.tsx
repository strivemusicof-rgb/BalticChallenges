import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Reveal } from '@/components/reveal';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Segmented } from '@/components/ui/segmented';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useLeaderboard } from '@/hooks/social-queries';
import { COUNTRY_LABELS } from '@/lib/format';
import type { Country, Leaderboard, LeaderboardEntry } from '@/lib/types';

type Tab = 'global' | 'baltics' | 'friends';
const TABS = [
  { id: 'global', label: 'Global' },
  { id: 'baltics', label: 'Baltics' },
  { id: 'friends', label: 'Friends' },
] as const;

const PERIODS: { id: Leaderboard['period']; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

const MEDAL = ['#E4A23B', '#A7B1AC', '#C47A3E'];

function Row({ entry, isMe, metric }: { entry: LeaderboardEntry; isMe: boolean; metric: Leaderboard['metric'] }) {
  const medal = MEDAL[entry.rank - 1];
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/user/[id]', params: { id: entry.id } })}
      scaleTo={0.98}
      style={[styles.row, isMe && styles.me]}>
      <View style={[styles.rank, medal ? { backgroundColor: medal } : null]}>
        <ThemedText style={[styles.rankText, medal ? { color: '#FFFFFF' } : null]}>{entry.rank}</ThemedText>
      </View>
      <Avatar name={entry.displayName} url={entry.avatarUrl} size={40} />
      <View style={styles.flex}>
        <ThemedText type="smallBold">{isMe ? `${entry.displayName} (you)` : entry.displayName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          LVL {entry.level}
        </ThemedText>
      </View>
      <ThemedText style={styles.score}>
        {entry.score.toLocaleString()}
        {metric === 'xp' ? ' XP' : ''}
      </ThemedText>
    </PressableScale>
  );
}

export default function LeaderboardScreen() {
  const [tab, setTab] = useState<Tab>('global');
  const [country, setCountry] = useState<Country>('LV');
  const [period, setPeriod] = useState<Leaderboard['period']>('week');
  const scope: Leaderboard['scope'] = tab === 'baltics' ? 'country' : tab;
  const board = useLeaderboard(scope, period, tab === 'baltics' ? country : undefined);

  return (
    <Screen edges={[]} refreshing={board.isRefetching} onRefresh={() => void board.refetch()}>
      <Segmented options={TABS} value={tab} onChange={setTab} />
      {tab === 'baltics' && (
        <View style={styles.chips}>
          {(Object.keys(COUNTRY_LABELS) as Country[]).map((code) => (
            <Chip
              key={code}
              compact
              label={`${COUNTRY_LABELS[code].flag} ${COUNTRY_LABELS[code].name}`}
              selected={country === code}
              onPress={() => setCountry(code)}
            />
          ))}
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {PERIODS.map((item) => (
          <Chip key={item.id} compact label={item.label} selected={period === item.id} onPress={() => setPeriod(item.id)} />
        ))}
      </ScrollView>

      {board.isPending ? (
        <LoadingState />
      ) : board.isError ? (
        <ErrorState error={board.error} onRetry={() => board.refetch()} />
      ) : (
        <>
          <ThemedText style={styles.subtitle}>{board.data.metric === 'xp' ? 'Most XP' : 'Most Challenges'}</ThemedText>
          {board.data.entries.length === 0 ? (
            <EmptyState emoji="🏆" title="No one on the board yet" body="Complete a challenge to claim the top spot." />
          ) : (
            <View style={styles.list}>
              {board.data.entries.map((entry, index) => (
                <Reveal key={entry.id} index={index}>
                  <Row entry={entry} isMe={entry.id === board.data.me?.id} metric={board.data.metric} />
                </Reveal>
              ))}
            </View>
          )}
          {board.data.me && board.data.me.rank > board.data.entries.length && (
            <Row entry={board.data.me} isMe metric={board.data.metric} />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 800,
  },
  list: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.medium,
  },
  me: {
    backgroundColor: Brand.mint,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: 800,
    color: '#4F5E56',
  },
  flex: {
    flex: 1,
  },
  score: {
    fontSize: 15,
    fontWeight: 800,
  },
});
