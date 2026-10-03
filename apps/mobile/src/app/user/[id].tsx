import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { HeroScroll } from '@/components/hero-scroll';
import { PostCard } from '@/components/post-card';
import { Reveal } from '@/components/reveal';
import { EmptyState, ErrorState, LoadingState, SectionHeader } from '@/components/screen';
import { StatRow } from '@/components/stat-row';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { HexBadge } from '@/components/ui/hex-badge';
import { IconButton } from '@/components/ui/icon-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Brand, Spacing } from '@/constants/theme';
import { useBlock, useFollow, usePublicProfile, useReport, useUserPosts } from '@/hooks/social-queries';
import { BRAND_IMAGES } from '@/lib/brand-images';
import { showAlert } from '@/lib/dialog';
import { COUNTRY_LABELS } from '@/lib/format';
import { askReportReason, confirmBlock, reportReceived } from '@/lib/moderation-actions';

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = usePublicProfile(id);
  const posts = useUserPosts(id);
  const follow = useFollow();
  const block = useBlock();
  const report = useReport();

  if (profile.isPending) return <LoadingState />;
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />;

  const { user, relationship, canView, stats, badges } = profile.data;

  function showMenu() {
    showAlert(user.displayName, undefined, [
      {
        text: 'Report profile',
        onPress: async () => {
          const reason = await askReportReason('profile');
          if (reason) report.mutate({ targetType: 'user', targetId: user.id, reason }, { onSuccess: reportReceived });
        },
      },
      relationship.blockedByMe
        ? { text: 'Unblock', onPress: () => block.mutate({ id: user.id, block: false }) }
        : {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              if (await confirmBlock(user.displayName)) block.mutate({ id: user.id, block: true });
            },
          },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const followLabel = relationship.following
    ? relationship.isFriend
      ? 'Friends'
      : 'Following'
    : relationship.followsMe
      ? 'Follow back'
      : 'Follow';

  return (
    <HeroScroll
      image={BRAND_IMAGES.profileCover.uri}
      height={200}
      refreshing={profile.isRefetching}
      onRefresh={() => void Promise.all([profile.refetch(), posts.refetch()])}
      actions={relationship.isMe ? null : <IconButton icon="ellipsis-horizontal" label="Profile options" onPress={showMenu} />}
      overlay={
        <View style={styles.avatarWrap}>
          <View style={styles.avatarRing}>
            <Avatar name={user.displayName} url={user.avatarUrl} size={92} />
          </View>
        </View>
      }>
      <Reveal style={styles.header}>
        <ThemedText style={styles.name}>{user.displayName}</ThemedText>
        <ThemedText style={styles.level}>
          {user.level.title} LVL {user.level.level}
        </ThemedText>
        {user.bio.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            {user.bio}
          </ThemedText>
        )}
        <View style={styles.xpRow}>
          <View style={styles.flex}>
            <ProgressBar progress={user.level.progress} height={8} />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {user.level.xp.toLocaleString()} XP
          </ThemedText>
        </View>
        {stats && (
          <View style={styles.counts}>
            <Pressable onPress={() => router.push({ pathname: '/follows', params: { id: user.id, direction: 'followers' } })}>
              <ThemedText type="small" themeColor="textSecondary">
                <ThemedText type="smallBold">{stats.followers}</ThemedText> followers
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push({ pathname: '/follows', params: { id: user.id, direction: 'following' } })}>
              <ThemedText type="small" themeColor="textSecondary">
                <ThemedText type="smallBold">{stats.following}</ThemedText> following
              </ThemedText>
            </Pressable>
          </View>
        )}
        <View style={styles.cta}>
          {relationship.isMe ? (
            <Button variant="secondary" label="Edit profile" icon="create-outline" onPress={() => router.push('/settings')} />
          ) : relationship.blockedByMe ? (
            <Button variant="secondary" label="Unblock" onPress={() => block.mutate({ id: user.id, block: false })} />
          ) : (
            <Button
              variant={relationship.following ? 'secondary' : 'primary'}
              icon={relationship.following ? 'checkmark' : 'person-add-outline'}
              label={followLabel}
              loading={follow.isPending}
              onPress={() => follow.mutate({ id: user.id, follow: !relationship.following })}
            />
          )}
        </View>
      </Reveal>

      {!canView ? (
        <EmptyState
          emoji="🔒"
          title={user.profileVisibility === 'friends' ? 'Friends only' : 'Private profile'}
          body={user.profileVisibility === 'friends' ? 'Follow each other to see adventures and badges.' : undefined}
        />
      ) : (
        <>
          {stats && (
            <Reveal index={1}>
              <View style={styles.countries}>
                {stats.countryProgress.map((country) => (
                  <View key={country.country} style={styles.country}>
                    <ThemedText style={styles.flag}>{COUNTRY_LABELS[country.country].flag}</ThemedText>
                    <ThemedText type="smallBold">{country.percent}%</ThemedText>
                  </View>
                ))}
              </View>
              <StatRow
                items={[
                  { value: stats.challengesCompleted, label: 'challenges' },
                  { value: stats.placesVisited, label: 'places' },
                  { value: stats.achievementsUnlocked, label: 'badges' },
                ]}
              />
            </Reveal>
          )}
          {badges.length > 0 && (
            <Reveal index={2} style={styles.section}>
              <SectionHeader title="Badges" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badges} style={styles.bleed}>
                {badges.map((badge) => (
                  <View key={badge.id} style={styles.badge} accessibilityLabel={badge.title}>
                    <HexBadge icon={badge.icon} size={54} />
                    <ThemedText style={styles.badgeLabel} numberOfLines={2}>
                      {badge.title}
                    </ThemedText>
                  </View>
                ))}
              </ScrollView>
            </Reveal>
          )}
          <SectionHeader title="Adventures" />
          {posts.data?.length === 0 && <EmptyState emoji="🗺️" title="No posts yet" />}
          {posts.data?.map((post) => <PostCard key={post.id} post={post} />)}
          {posts.hasNextPage && (
            <Button variant="ghost" label="Load more" loading={posts.isFetchingNextPage} onPress={() => void posts.fetchNextPage()} />
          )}
        </>
      )}
    </HeroScroll>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    alignItems: 'center',
    marginTop: -50,
    zIndex: 2,
  },
  avatarRing: {
    borderRadius: 52,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    gap: 4,
    marginTop: -Spacing.three,
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 800,
  },
  level: {
    fontSize: 14,
    fontWeight: 700,
    color: Brand.sea,
  },
  center: {
    textAlign: 'center',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  counts: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  cta: {
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
  countries: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.two,
  },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flag: {
    fontSize: 22,
    lineHeight: 28,
  },
  section: {
    gap: Spacing.three,
  },
  bleed: {
    marginHorizontal: -(Spacing.three + 4),
  },
  badges: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.three + 4,
  },
  badge: {
    width: 70,
    alignItems: 'center',
    gap: 6,
  },
  badgeLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 600,
    textAlign: 'center',
  },
});
