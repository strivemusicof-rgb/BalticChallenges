import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { HeroScroll } from '@/components/hero-scroll';
import { PostCard } from '@/components/post-card';
import { Reveal } from '@/components/reveal';
import { ErrorState, LoadingState, SectionHeader } from '@/components/screen';
import { StatRow } from '@/components/stat-row';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Tag } from '@/components/ui/tag';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { usePlace } from '@/hooks/social-queries';
import { Flag, Glyph } from '@/components/ui/glyph';
import { categoryGlyph } from '@/lib/glyphs';
import { useT } from '@/lib/i18n';

export default function PlaceScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const place = usePlace(id);

  if (place.isPending) return <LoadingState />;
  if (place.isError) return <ErrorState error={place.error} onRetry={() => place.refetch()} />;

  const { place: info, challenges, posts } = place.data;
  const next = challenges.find((challenge) => !challenge.completed) ?? challenges[0];
  const totalXp = challenges.reduce((sum, challenge) => sum + challenge.xpReward, 0);

  return (
    <HeroScroll
      image={info.images[0]}
      fallback={categoryGlyph(challenges[0]?.categoryId)}
      credit={info.imageCredit}
      refreshing={place.isRefetching}
      onRefresh={() => void place.refetch()}
      actions={
        info.officialUrl ? (
          <IconButton icon="globe-outline" label={t('place.website')} onPress={() => void WebBrowser.openBrowserAsync(info.officialUrl!)} />
        ) : null
      }
      footer={
        next ? (
          <Button
            label={next.completed ? t('place.viewChallenge') : t('challenge.start')}
            onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: next.id } })}
          />
        ) : null
      }>
      <Reveal>
        <ThemedText style={styles.title}>{info.name}</ThemedText>
        <View style={styles.location}>
          <Icon name="location-outline" size={15} color="#6B7A72" />
          <ThemedText type="small" themeColor="textSecondary">
            {[info.city, t(`countries.${info.country}`)].filter(Boolean).join(', ')}
          </ThemedText>
        </View>
      </Reveal>

      <Reveal index={1} style={styles.tags}>
        {info.region && <Tag label={info.region} tone="blue" />}
        <View style={styles.countryTag}>
          <Flag country={info.country} width={18} />
          <ThemedText type="small">{t(`countries.${info.country}`)}</ThemedText>
        </View>
        <View style={styles.flex} />
        {totalXp > 0 && <Tag label={t('common.xp', { xp: totalXp })} icon="star" tone="amber" />}
      </Reveal>

      <Reveal index={2}>
        <StatRow
          items={[
            { value: info.explorerCount, label: t('place.explorers') },
            { value: info.photoCount, label: t('place.photos') },
            { value: info.postCount, label: t('place.posts') },
            { value: info.challengeCount, label: t('place.challenges') },
          ]}
        />
      </Reveal>

      {info.description.length > 0 && (
        <Reveal index={3}>
          <ThemedText style={styles.description}>{info.description}</ThemedText>
        </Reveal>
      )}

      <Reveal index={4} style={styles.section}>
        <SectionHeader title={t('place.challengesHere')} />
        {challenges.map((challenge) => (
          <PressableScale
            key={challenge.id}
            onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: challenge.id } })}
            style={styles.challengeRow}>
            <View style={[styles.challengeIcon, challenge.completed && styles.challengeIconDone]}>
              {challenge.completed ? (
                <Glyph name="check-bold" size={20} color="#FFFFFF" />
              ) : (
                <Glyph name={categoryGlyph(challenge.categoryId)} size={20} color={Brand.sea} />
              )}
            </View>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{challenge.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t(`difficulty.${challenge.difficulty}.name`)}
                {challenge.completed ? ` · ${t('common.completed')}` : ''}
              </ThemedText>
            </View>
            <ThemedText style={styles.xp}>{t('common.xp', { xp: challenge.xpReward })}</ThemedText>
          </PressableScale>
        ))}
      </Reveal>

      <Reveal index={5} style={styles.section}>
        <SectionHeader title={t('place.communityPhotos')} />
        {posts.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('place.noPhotos')}
          </ThemedText>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </Reveal>
    </HeroScroll>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 800,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3B4A42',
  },
  section: {
    gap: Spacing.two,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E6ECE8',
  },
  challengeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeIconDone: {
    backgroundColor: Brand.success,
  },
  countryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F3F1',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  xp: {
    color: Brand.sea,
    fontWeight: 800,
    fontSize: 14,
    borderRadius: Radius.small,
  },
});
