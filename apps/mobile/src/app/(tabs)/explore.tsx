import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChallengeCard, XpLabel } from '@/components/challenge-card';
import { ChallengeMap, type MapFocus } from '@/components/challenge-map';
import { Photo } from '@/components/photo';
import { EmptyState } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Brand, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useChallenges, type ChallengeFilters } from '@/hooks/queries';
import { useLocation } from '@/hooks/use-location';
import { formatDistance } from '@/lib/format';
import { categoryGlyph } from '@/lib/glyphs';
import { useT } from '@/lib/i18n';
import type { ChallengeSummary } from '@/lib/types';

type Filter = 'nearby' | 'challenges' | 'places' | 'completed';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'nearby', label: 'explore.nearby' },
  { id: 'challenges', label: 'explore.challenges' },
  { id: 'places', label: 'explore.places' },
  { id: 'completed', label: 'explore.completed' },
];

function Preview({ challenge }: { challenge: ChallengeSummary }) {
  const t = useT();
  const open = () => router.push({ pathname: '/challenge/[id]', params: { id: challenge.id } });
  const where = [challenge.place?.city, challenge.country && t(`countries.${challenge.country}`)].filter(Boolean).join(', ');
  return (
    <Animated.View entering={FadeInDown} exiting={FadeOutDown.duration(160)} style={styles.preview}>
      <PressableScale onPress={open} scaleTo={0.98} style={styles.previewRow}>
        <Photo uri={challenge.imageUrl} fallback={categoryGlyph(challenge.categoryId)} style={styles.previewPhoto} />
        <View style={styles.flex}>
          <ThemedText style={styles.previewTitle} numberOfLines={2}>
            {challenge.place?.name ?? challenge.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {[where, formatDistance(challenge.distanceM)].filter(Boolean).join(' · ')}
          </ThemedText>
          <XpLabel xp={challenge.xpReward} />
        </View>
      </PressableScale>
      <Button
        label={challenge.userStatus === 'completed' ? t('explore.view') : t('explore.start')}
        icon={challenge.userStatus === 'completed' ? 'eye-outline' : 'navigate'}
        size="small"
        onPress={open}
      />
    </Animated.View>
  );
}

export default function ExploreScreen() {
  const location = useLocation();
  const [filter, setFilter] = useState<Filter>('challenges');
  const t = useT();
  const [selected, setSelected] = useState<ChallengeSummary | null>(null);
  const [listView, setListView] = useState(false);
  const [search, setSearch] = useState('');
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const filters: ChallengeFilters = { coords: location.coords, limit: 200 };
  if (filter === 'nearby') filters.radiusKm = 50;
  if (filter === 'completed') filters.status = 'completed';
  if (search.trim().length >= 2) filters.q = search.trim();
  const challenges = useChallenges(filters);

  const visible = useMemo(() => {
    const data = challenges.data ?? [];
    if (filter !== 'places') return data;
    const seen = new Set<string>();
    return data.filter((challenge) => {
      const key = challenge.place?.id ?? challenge.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [challenges.data, filter]);

  async function choose(next: Filter) {
    if (next === 'nearby' && location.permission !== 'granted' && !(await location.request())) return;
    setSelected(null);
    setFilter(next);
  }

  async function locate() {
    if (location.permission !== 'granted' && !(await location.request())) return;
    const coords = location.coords ?? (await location.refresh());
    if (coords) setFocus({ lat: coords.lat, lng: coords.lng, key: Date.now() });
  }

  const topBar = (
    <View style={styles.topBar}>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Icon name="search" size={18} color="#7C8A83" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('explore.search')}
            placeholderTextColor="#8A9790"
            returnKeyType="search"
            clearButtonMode="while-editing"
            style={styles.input}
          />
          {challenges.isFetching && <ActivityIndicator size="small" color={Brand.sea} />}
        </View>
        <PressableScale
          onPress={() => {
            setSelected(null);
            setListView(!listView);
          }}
          accessibilityLabel={listView ? t('explore.showMap') : t('explore.showList')}
          style={styles.filterButton}>
          <Icon name={listView ? 'map-outline' : 'list'} size={20} color="#15211B" />
        </PressableScale>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTERS.map((item) => (
          <Chip key={item.id} compact label={t(item.label)} selected={filter === item.id} onPress={() => choose(item.id)} />
        ))}
      </ScrollView>
    </View>
  );

  if (listView) {
    return (
      <SafeAreaView edges={['top']} style={styles.listScreen}>
        {topBar}
        <FlatList
          data={visible}
          keyExtractor={(challenge) => challenge.id}
          renderItem={({ item }) => <ChallengeCard challenge={item} />}
          contentContainerStyle={styles.list}
          initialNumToRender={8}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            challenges.isSuccess ? <EmptyState icon="compass-outline" title={t('explore.nothingHere')} body={t('explore.tryAnother')} /> : null
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ChallengeMap
        challenges={visible}
        userCoords={location.coords}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
        focus={focus}
      />

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.overlayTop}>
        {topBar}
      </SafeAreaView>

      <View style={styles.bottom} pointerEvents="box-none">
        <View style={styles.locateRow} pointerEvents="box-none">
          <IconButton icon="navigate-outline" label={t('explore.myLocation')} onPress={locate} size={44} color={Brand.sea} />
        </View>
        {selected && <Preview key={selected.id} challenge={selected} />}
        {!selected && challenges.isSuccess && visible.length === 0 && (
          <View style={styles.preview}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {filter === 'completed' ? t('explore.noCompleted') : t('explore.noMatch')}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
    gap: 3,
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    minHeight: 46,
    ...Shadow.card,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#15211B',
    paddingVertical: Spacing.two,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: Radius.medium,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  chips: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  listScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  bottom: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  locateRow: {
    alignItems: 'flex-end',
  },
  preview: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.three,
    ...Shadow.floating,
  },
  previewRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
  },
  previewPhoto: {
    width: 72,
    height: 72,
    borderRadius: Radius.medium,
  },
  previewTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: 800,
  },
  center: {
    textAlign: 'center',
  },
});
