import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { XpLabel } from '@/components/challenge-card';
import { GoalCard } from '@/components/goal-card';
import { Reveal } from '@/components/reveal';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useGoals, useHomeFeed } from '@/hooks/queries';
import { useLocation } from '@/hooks/use-location';
import { formatDistance } from '@/lib/format';

type Period = 'daily' | 'weekly' | 'monthly';
const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
] as const;

function DailyTab() {
  const location = useLocation();
  const feed = useHomeFeed(location.coords);
  if (feed.isPending) return <LoadingState />;
  if (feed.isError) return <ErrorState error={feed.error} onRetry={() => feed.refetch()} />;
  const today = feed.data.todaysChallenge;
  if (!today) return <EmptyState emoji="☀️" title="No daily challenge today" body="Check back tomorrow." />;
  const done = today.userStatus === 'completed';

  return (
    <Reveal>
      <Card
        onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: today.id } })}
        style={[styles.today, done && styles.todayDone]}>
        <ThemedText style={styles.kicker}>Today’s Challenge</ThemedText>
        <View style={styles.todayRow}>
          <View style={styles.todayIcon}>
            <Icon name="location" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.flex}>
            <ThemedText style={styles.todayTitle}>{today.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {today.description}
            </ThemedText>
            <XpLabel xp={today.xpReward + feed.data.dailyBonusXp} />
          </View>
        </View>
        <View style={styles.todayFooter}>
          {today.distanceM !== null ? (
            <ThemedText type="small" themeColor="textSecondary">
              {formatDistance(today.distanceM)} away
            </ThemedText>
          ) : (
            <View />
          )}
          {done ? (
            <View style={styles.completedPill}>
              <Icon name="checkmark" size={12} color="#FFFFFF" />
              <ThemedText style={styles.completedText}>Completed</ThemedText>
            </View>
          ) : (
            <ThemedText type="smallBold" style={{ color: Brand.sea }}>
              +{feed.data.dailyBonusXp} XP bonus today
            </ThemedText>
          )}
        </View>
      </Card>
      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        A new challenge of the day is picked every morning (Riga time). Completing it earns a bonus once per day.
      </ThemedText>
    </Reveal>
  );
}

export default function GoalsScreen() {
  const [period, setPeriod] = useState<Period>('daily');
  const goals = useGoals();
  const list = (goals.data ?? []).filter((goal) => goal.period === period);

  return (
    <Screen edges={[]} refreshing={goals.isRefetching} onRefresh={() => void goals.refetch()}>
      <Segmented options={PERIODS} value={period} onChange={setPeriod} />
      {period === 'daily' ? (
        <DailyTab />
      ) : goals.isPending ? (
        <LoadingState />
      ) : goals.isError ? (
        <ErrorState error={goals.error} onRetry={() => goals.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState emoji="🗓️" title="No goals right now" body="New goals start every week and month." />
      ) : (
        list.map((goal, index) => (
          <Reveal key={goal.id} index={index}>
            <GoalCard goal={goal} />
          </Reveal>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: 4,
  },
  today: {
    borderWidth: 1.5,
    borderColor: '#CFE6DA',
    gap: Spacing.three,
  },
  todayDone: {
    borderColor: Brand.success,
  },
  kicker: {
    fontSize: 15,
    fontWeight: 800,
  },
  todayRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  todayIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Brand.sea,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayTitle: {
    fontSize: 16,
    fontWeight: 700,
  },
  todayFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Brand.success,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 700,
  },
  note: {
    marginTop: Spacing.three,
  },
});
