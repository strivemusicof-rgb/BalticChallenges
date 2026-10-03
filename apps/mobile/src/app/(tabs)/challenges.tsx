import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CollectionRow } from '@/components/collection-row';
import { Reveal } from '@/components/reveal';
import { EmptyState, ErrorState, LoadingState, PageTitle, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Segmented } from '@/components/ui/segmented';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useCollections } from '@/hooks/queries';
import { useT } from '@/lib/i18n';

type Tab = 'mine' | 'all';
const TABS = [
  { id: 'mine', label: 'collections.mine' },
  { id: 'all', label: 'collections.all' },
] as const;

function Shortcut({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={styles.shortcut} accessibilityLabel={label}>
      <View style={styles.shortcutIcon}>
        <Icon name={icon} size={18} color={Brand.sea} />
      </View>
      <ThemedText style={styles.shortcutLabel}>{label}</ThemedText>
    </PressableScale>
  );
}

export default function CollectionsScreen() {
  const t = useT();
  const [picked, setPicked] = useState<Tab | null>(null);
  const collections = useCollections();

  const all = collections.data ?? [];
  const mine = all.filter((collection) => collection.completed > 0);
  // Until the user picks a tab, open on their own collections only if they have any.
  const tab: Tab = picked ?? (mine.length > 0 ? 'mine' : 'all');
  const list = tab === 'mine' ? mine : all;

  return (
    <Screen refreshing={collections.isRefetching} onRefresh={() => void collections.refetch()}>
      <PageTitle title={t('collections.title')} />
      <View style={styles.shortcuts}>
        <Shortcut icon="calendar-outline" label={t('collections.dailyWeekly')} onPress={() => router.push('/goals')} />
        <Shortcut icon="search-outline" label={t('collections.allChallenges')} onPress={() => router.push('/browse')} />
        <Shortcut icon="ribbon-outline" label={t('collections.badges')} onPress={() => router.push('/achievements')} />
      </View>
      <Segmented options={TABS.map((item) => ({ ...item, label: t(item.label) }))} value={tab} onChange={setPicked} />

      {collections.isPending ? (
        <LoadingState />
      ) : collections.isError ? (
        <ErrorState error={collections.error} onRetry={() => collections.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="map-outline"
          title={t('collections.emptyTitle')}
          body={t('collections.emptyBody')}
        />
      ) : (
        list.map((collection, index) => (
          <Reveal key={`${tab}-${collection.id}`} index={index}>
            <CollectionRow collection={collection} />
          </Reveal>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  shortcuts: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  shortcut: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.two + 4,
    borderRadius: Radius.medium,
    backgroundColor: '#F5F8F6',
  },
  shortcutIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: 700,
  },
});
