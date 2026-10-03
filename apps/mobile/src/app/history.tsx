import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { XpLabel } from '@/components/challenge-card';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Glyph } from '@/components/ui/glyph';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useHistory } from '@/hooks/queries';
import { timeAgo } from '@/lib/format';
import type { GlyphName } from '@/lib/glyphs';
import { useT } from '@/lib/i18n';
import type { HistoryEntry } from '@/lib/types';

const STATUS_STYLE: Record<HistoryEntry['status'], { glyph: GlyphName; color: string }> = {
  completed: { glyph: 'check-circle', color: Brand.success },
  in_progress: { glyph: 'navigation-variant', color: Brand.sky },
  abandoned: { glyph: 'close-circle-outline', color: '#9AA7A0' },
  rejected: { glyph: 'alert-circle-outline', color: Brand.danger },
  flagged: { glyph: 'clock-outline', color: Brand.amber },
};

export default function HistoryScreen() {
  const t = useT();
  const history = useHistory();

  if (history.isPending) return <LoadingState />;
  if (history.isError) return <ErrorState error={history.error} onRetry={() => history.refetch()} />;

  return (
    <Screen edges={['bottom']} refreshing={history.isRefetching} onRefresh={() => void history.refetch()}>
      {history.data.length === 0 ? (
        <EmptyState icon="map-outline" title={t('history.empty')} body={t('history.emptyBody')} />
      ) : (
        history.data.map((entry) => {
          const status = STATUS_STYLE[entry.status];
          return (
            <PressableScale
              key={`${entry.challengeId}-${entry.startedAt}`}
              scaleTo={0.99}
              onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: entry.challengeId } })}
              style={styles.row}>
              <View style={[styles.icon, { backgroundColor: `${status.color}1A` }]}>
                <Glyph name={status.glyph} size={22} color={status.color} />
              </View>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{entry.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {[t(`history.${entry.status}`), entry.city, timeAgo(entry.completedAt ?? entry.startedAt)].filter(Boolean).join(' · ')}
                </ThemedText>
              </View>
              {entry.status === 'completed' && entry.xpAwarded !== null && <XpLabel xp={entry.xpAwarded} />}
            </PressableScale>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two + 2,
    borderRadius: Radius.large,
    backgroundColor: '#F7F9F8',
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
});
