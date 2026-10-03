import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useHistory } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/format';
import type { HistoryEntry } from '@/lib/types';

const STATUS_LABEL: Record<HistoryEntry['status'], string> = {
  completed: '✓ Completed',
  in_progress: '🥾 In progress',
  abandoned: 'Abandoned',
  rejected: 'Not verified',
  flagged: '⏳ Under review',
};

export default function HistoryScreen() {
  const theme = useTheme();
  const history = useHistory();

  if (history.isPending) return <LoadingState />;
  if (history.isError) return <ErrorState error={history.error} onRetry={() => history.refetch()} />;

  return (
    <Screen edges={[]} refreshing={history.isRefetching} onRefresh={() => void history.refetch()}>
      {history.data.length === 0 ? (
        <EmptyState emoji="🗺️" title="No adventures yet" body="Start a challenge and it will show up here." />
      ) : (
        history.data.map((entry) => (
          <Card
            key={`${entry.challengeId}-${entry.startedAt}`}
            onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: entry.challengeId } })}
            style={styles.row}>
            <ThemedText style={styles.icon}>{entry.icon}</ThemedText>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{entry.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {[STATUS_LABEL[entry.status], entry.city, timeAgo(entry.completedAt ?? entry.startedAt)]
                  .filter(Boolean)
                  .join(' · ')}
              </ThemedText>
            </View>
            {entry.status === 'completed' && entry.xpAwarded !== null && (
              <ThemedText type="smallBold" style={{ color: theme.xp }}>
                +{entry.xpAwarded}
              </ThemedText>
            )}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  icon: {
    fontSize: 28,
    lineHeight: 34,
  },
  flex: {
    flex: 1,
  },
});
