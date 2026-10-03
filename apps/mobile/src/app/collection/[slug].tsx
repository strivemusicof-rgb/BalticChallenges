import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { XpLabel } from '@/components/challenge-card';
import { HeroScroll } from '@/components/hero-scroll';
import { Photo } from '@/components/photo';
import { Reveal } from '@/components/reveal';
import { ErrorState, LoadingState } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { useCollection } from '@/hooks/queries';
import { categoryGlyph, collectionGlyph } from '@/lib/glyphs';
import { useT } from '@/lib/i18n';

export default function CollectionScreen() {
  const t = useT();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const collection = useCollection(slug);

  if (collection.isPending) return <LoadingState />;
  if (collection.isError) return <ErrorState error={collection.error} onRetry={() => collection.refetch()} />;

  const data = collection.data;
  const done = data.completedAt !== null;

  return (
    <HeroScroll image={data.imageUrl} fallback={collectionGlyph(data.slug)} refreshing={collection.isRefetching} onRefresh={() => void collection.refetch()}>
      <Reveal>
        <ThemedText style={styles.title}>
          {data.title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {data.description}
        </ThemedText>
      </Reveal>

      <Reveal index={1} style={styles.progressBox}>
        <View style={styles.row}>
          <ThemedText style={styles.count}>
            {data.completed} / {data.total}
          </ThemedText>
          {done ? (
            <View style={styles.row}>
              <Icon name="checkmark-circle" size={16} color={Brand.success} />
              <ThemedText type="smallBold" style={{ color: Brand.success }}>
                {t('common.completed')}
              </ThemedText>
            </View>
          ) : (
            <XpLabel xp={data.xpReward} />
          )}
        </View>
        <ProgressBar progress={data.total ? data.completed / data.total : 0} height={10} color={done ? Brand.success : Brand.sea} />
        {!done && (
          <ThemedText type="small" themeColor="textSecondary">
            {t('collections.progressHint', { xp: data.xpReward })}
          </ThemedText>
        )}
      </Reveal>

      <View style={styles.grid}>
        {data.challenges.map((challenge, index) => {
          const completed = challenge.userStatus === 'completed';
          return (
            <Reveal key={challenge.id} index={index + 2} style={styles.cell}>
              <PressableScale
                onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: challenge.id } })}
                style={styles.item}
                accessibilityLabel={`${challenge.place?.name ?? challenge.title}${completed ? `, ${t('common.completed')}` : ''}`}>
                <Photo uri={challenge.imageUrl} fallback={categoryGlyph(challenge.categoryId)} style={styles.itemPhoto}>
                  {!completed && <View style={styles.dim} />}
                  <View style={[styles.state, { backgroundColor: completed ? Brand.success : 'rgba(20,32,26,0.7)' }]}>
                    <Icon name={completed ? 'checkmark' : 'lock-closed'} size={13} color="#FFFFFF" />
                  </View>
                </Photo>
                <View style={styles.itemBody}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {challenge.place?.name ?? challenge.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {challenge.place?.city ?? challenge.categoryName}
                  </ThemedText>
                </View>
              </PressableScale>
            </Reveal>
          );
        })}
      </View>
    </HeroScroll>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 800,
  },
  description: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 21,
  },
  progressBox: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: '#F5F8F6',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  count: {
    fontSize: 18,
    fontWeight: 800,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.three,
  },
  cell: {
    width: '48%',
  },
  item: {
    borderRadius: Radius.large,
    backgroundColor: '#FFFFFF',
    ...Shadow.card,
  },
  itemPhoto: {
    height: 110,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
  },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  state: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    padding: Spacing.two + 2,
    gap: 2,
  },
});
