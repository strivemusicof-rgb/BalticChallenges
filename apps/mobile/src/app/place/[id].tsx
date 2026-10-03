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
import { COUNTRY_LABELS, DIFFICULTY_LABELS } from '@/lib/format';

export default function PlaceScreen() {
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
      fallback={challenges[0]?.icon ?? '📍'}
      credit={info.imageCredit}
      refreshing={place.isRefetching}
      onRefresh={() => void place.refetch()}
      actions={
        info.officialUrl ? (
          <IconButton icon="globe-outline" label="Official website" onPress={() => void WebBrowser.openBrowserAsync(info.officialUrl!)} />
        ) : null
      }
      footer={
        next ? (
          <Button
            label={next.completed ? 'View challenge' : 'Start Challenge'}
            onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: next.id } })}
          />
        ) : null
      }>
      <Reveal>
        <ThemedText style={styles.title}>{info.name}</ThemedText>
        <View style={styles.location}>
          <Icon name="location-outline" size={15} color="#6B7A72" />
          <ThemedText type="small" themeColor="textSecondary">
            {[info.city, COUNTRY_LABELS[info.country].name].filter(Boolean).join(', ')}
          </ThemedText>
        </View>
      </Reveal>

      <Reveal index={1} style={styles.tags}>
        {info.region && <Tag label={info.region} tone="blue" />}
        <Tag label={`${COUNTRY_LABELS[info.country].flag} ${COUNTRY_LABELS[info.country].name}`} />
        <View style={styles.flex} />
        {totalXp > 0 && <Tag label={`+${totalXp} XP`} icon="star" tone="amber" />}
      </Reveal>

      <Reveal index={2}>
        <StatRow
          items={[
            { value: info.explorerCount, label: 'explorers' },
            { value: info.photoCount, label: 'photos' },
            { value: info.postCount, label: 'posts' },
            { value: info.challengeCount, label: 'challenges' },
          ]}
        />
      </Reveal>

      {info.description.length > 0 && (
        <Reveal index={3}>
          <ThemedText style={styles.description}>{info.description}</ThemedText>
        </Reveal>
      )}

      <Reveal index={4} style={styles.section}>
        <SectionHeader title="Challenges here" />
        {challenges.map((challenge) => (
          <PressableScale
            key={challenge.id}
            onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: challenge.id } })}
            style={styles.challengeRow}>
            <View style={[styles.challengeIcon, challenge.completed && styles.challengeIconDone]}>
              <ThemedText style={styles.challengeEmoji}>{challenge.completed ? '✓' : challenge.icon}</ThemedText>
            </View>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{challenge.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {DIFFICULTY_LABELS[challenge.difficulty].name}
                {challenge.completed ? ' · Completed' : ''}
              </ThemedText>
            </View>
            <ThemedText style={styles.xp}>+{challenge.xpReward} XP</ThemedText>
          </PressableScale>
        ))}
      </Reveal>

      <Reveal index={5} style={styles.section}>
        <SectionHeader title="Community photos" />
        {posts.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No one has shared this place yet. Be the first after you complete a challenge here.
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
  challengeEmoji: {
    fontSize: 20,
    lineHeight: 26,
    color: '#FFFFFF',
    fontWeight: 800,
  },
  xp: {
    color: Brand.sea,
    fontWeight: 800,
    fontSize: 14,
    borderRadius: Radius.small,
  },
});
