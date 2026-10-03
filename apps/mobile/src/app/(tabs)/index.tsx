import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ChallengeCard, XpLabel } from '@/components/challenge-card';
import { GoalCard } from '@/components/goal-card';
import { Photo } from '@/components/photo';
import { PostCard } from '@/components/post-card';
import { Reveal } from '@/components/reveal';
import { SeasonBanner } from '@/components/season-banner';
import { EmptyState, ErrorState, LoadingState, Screen, SectionHeader } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Glyph } from '@/components/ui/glyph';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { XpHeader } from '@/components/xp-header';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { useHomeFeed } from '@/hooks/queries';
import { useFeed } from '@/hooks/social-queries';
import { useLocation } from '@/hooks/use-location';
import { formatDistance } from '@/lib/format';
import { categoryGlyph } from '@/lib/glyphs';
import { useT } from '@/lib/i18n';
import { useQueuedItems } from '@/lib/offline-queue';
import type { ChallengeSummary } from '@/lib/types';

function TodayCard({ challenge, bonus }: { challenge: ChallengeSummary; bonus: number }) {
  const t = useT();
  const open = () => router.push({ pathname: '/challenge/[id]', params: { id: challenge.id } });
  return (
    <View style={styles.todayCard}>
      <PressableScale onPress={open} scaleTo={0.985} accessibilityLabel={t('home.todaysChallengeA11y', { title: challenge.title })}>
      <Photo uri={challenge.imageUrl} fallback={categoryGlyph(challenge.categoryId)} shade style={styles.todayPhoto}>
        <View style={styles.todayTag}>
          <Icon name="star" size={12} color="#FFFFFF" />
          <ThemedText style={styles.todayTagText}>{t('home.todaysChallenge')}</ThemedText>
        </View>
        <View style={styles.todayBottom}>
          <ThemedText style={styles.todayTitle} numberOfLines={2}>
            {challenge.title}
          </ThemedText>
          <ThemedText style={styles.todayBody} numberOfLines={2}>
            {challenge.description}
          </ThemedText>
          <View style={styles.todayMeta}>
            <XpLabel xp={challenge.xpReward + bonus} color="#FFFFFF" />
            {challenge.distanceM !== null && (
              <View style={styles.inline}>
                <Icon name="location-outline" size={13} color="#FFFFFF" />
                <ThemedText style={styles.todayMetaText}>{t('common.away', { distance: formatDistance(challenge.distanceM) })}</ThemedText>
              </View>
            )}
          </View>
        </View>
      </Photo>
      </PressableScale>
      <View style={styles.todayFooter}>
        <Button label={t('home.startChallenge')} onPress={open} style={styles.startButton} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const t = useT();
  const location = useLocation();
  const feed = useHomeFeed(location.coords);
  const friends = useFeed('following');

  if (feed.isPending) return <LoadingState />;
  if (feed.isError) return <ErrorState error={feed.error} onRetry={() => feed.refetch()} />;

  const { me, todaysChallenge, dailyBonusXp, goals, nearby, inProgress, recommended } = feed.data;
  const weekly = goals.find((goal) => goal.period === 'weekly' && !goal.completedAt) ?? goals[0];

  return (
    <Screen
      refreshing={feed.isRefetching}
      onRefresh={() => {
        void location.refresh();
        void feed.refetch();
        void friends.refetch();
      }}>
      <Reveal index={0}>
        <XpHeader name={me.displayName} avatarUrl={me.avatarUrl} level={me.level} />
      </Reveal>

      {me.streak.current > 0 && (
        <Reveal index={1}>
          <View style={styles.streak}>
            <Glyph name="fire" size={20} color="#D9822B" />
            <View style={styles.flex}>
              <ThemedText style={styles.streakText}>{t('home.streak', { count: me.streak.current })}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('home.streakHint')}
              </ThemedText>
            </View>
          </View>
        </Reveal>
      )}

      {todaysChallenge && (
        <Reveal index={2}>
          <TodayCard challenge={todaysChallenge} bonus={dailyBonusXp} />
        </Reveal>
      )}

      <PendingSync />

      <Reveal index={3}>
        <SeasonBanner />
      </Reveal>

      {inProgress.length > 0 && (
        <Reveal index={3} style={styles.section}>
          <SectionHeader title={t('home.continue')} subtitle={t('home.continueSub')} />
          {inProgress.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </Reveal>
      )}

      <Reveal index={4} style={styles.section}>
        <SectionHeader
          title={t('home.nearYou')}
          subtitle={
            location.permission === 'granted'
              ? t('home.nearCount', { count: nearby.count, km: nearby.radiusKm })
              : t('home.nearOff')
          }
          onPress={() => router.navigate('/explore')}
        />
        {location.permission !== 'granted' ? (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              {t('home.locationWhy')}
            </ThemedText>
            <Button label={t('home.useLocation')} icon="locate" variant="secondary" onPress={location.request} />
          </Card>
        ) : nearby.count === 0 ? (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              {t('home.nothingNear', { km: nearby.radiusKm })}
            </ThemedText>
            <Button label={t('home.openMap')} icon="map-outline" variant="secondary" onPress={() => router.navigate('/explore')} />
          </Card>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} style={styles.bleed}>
            {nearby.challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} compact />
            ))}
          </ScrollView>
        )}
      </Reveal>

      {weekly && (
        <Reveal index={5} style={styles.section}>
          <SectionHeader title={t('home.thisWeek')} onPress={() => router.push('/goals')} />
          <GoalCard goal={weekly} onPress={() => router.push('/goals')} />
        </Reveal>
      )}

      <Reveal index={6} style={styles.section}>
        <SectionHeader title={t('home.recommended')} onPress={() => router.push('/browse')} />
        {recommended.length === 0 ? (
          <EmptyState icon="trophy-outline" title={t('home.allDone')} body={t('home.allDoneBody')} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel} style={styles.bleed}>
            {recommended.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} compact />
            ))}
          </ScrollView>
        )}
      </Reveal>

      <Reveal index={7} style={styles.section}>
        <SectionHeader title={t('home.friendsExploring')} onPress={() => router.push('/leaderboard')} />
        {friends.data && friends.data.length > 0 ? (
          friends.data.slice(0, 2).map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              {t('home.followHint')}
            </ThemedText>
            <Button label={t('home.findPeople')} icon="person-add-outline" variant="secondary" onPress={() => router.push('/people')} />
          </Card>
        )}
      </Reveal>
    </Screen>
  );
}

/** Shown while offline check-ins are waiting to be sent. */
function PendingSync() {
  const t = useT();
  const queued = useQueuedItems();
  if (queued.length === 0) return null;
  return (
    <View style={styles.pending}>
      <Icon name="cloud-upload-outline" size={18} color={Brand.sea} />
      <ThemedText type="smallBold" style={styles.pendingText}>
        {t('offline.waiting', { count: queued.length })}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: Brand.mint,
  },
  pendingText: {
    flex: 1,
    color: Brand.sea,
  },
  section: {
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  bleed: {
    marginHorizontal: -(Spacing.three + 4),
  },
  carousel: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three + 4,
    paddingVertical: Spacing.two,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#FFF4E3',
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    flexWrap: 'wrap',
  },
  streakText: {
    fontWeight: 800,
    color: '#B4690E',
  },
  todayCard: {
    borderRadius: Radius.large + 2,
    backgroundColor: Brand.seaDeep,
    overflow: 'hidden',
    ...Shadow.floating,
  },
  todayPhoto: {
    height: 220,
    justifyContent: 'space-between',
  },
  todayTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    margin: Spacing.three,
    backgroundColor: Brand.sea,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: 5,
  },
  todayTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.8,
  },
  todayBottom: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: 4,
  },
  todayTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: 800,
  },
  todayBody: {
    color: '#E3EEE8',
    fontSize: 14,
    lineHeight: 19,
  },
  todayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  todayMetaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 600,
  },
  todayFooter: {
    padding: Spacing.three,
    paddingTop: Spacing.two,
  },
  startButton: {
    backgroundColor: '#2F8F62',
  },
});
