import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Photo } from '@/components/photo';
import { Reveal } from '@/components/reveal';
import { ErrorState, LoadingState, SectionHeader } from '@/components/screen';
import { StatRow } from '@/components/stat-row';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { HexBadge } from '@/components/ui/hex-badge';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAchievements, useProfile } from '@/hooks/queries';
import { BRAND_IMAGES } from '@/lib/brand-images';
import { COUNTRY_LABELS } from '@/lib/format';

function LinkRow({ icon, label, detail, onPress }: { icon: IconName; label: string; detail?: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.linkRow}>
      <View style={styles.linkIcon}>
        <Icon name={icon} size={18} color={Brand.sea} />
      </View>
      <ThemedText style={styles.linkLabel}>{label}</ThemedText>
      {detail && (
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
      )}
      <Icon name="chevron-forward" size={18} color="#9AA7A0" />
    </PressableScale>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const profile = useProfile();
  const achievements = useAchievements();

  if (profile.isPending) return <LoadingState />;
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />;

  const { user, stats } = profile.data;
  const badges = [...(achievements.data ?? [])].sort((a, b) => Number(b.unlockedAt !== null) - Number(a.unlockedAt !== null));

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.cover}>
        <Photo uri={BRAND_IMAGES.profileCover.uri} shade style={StyleSheet.absoluteFill} />
        <View style={[styles.coverActions, { top: insets.top + Spacing.two }]}>
          <IconButton icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
        </View>
      </View>

      <View style={styles.body}>
        <Reveal style={styles.header}>
          <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Edit profile" style={styles.avatarRing}>
            <Avatar name={user.displayName} url={user.avatarUrl} size={96} />
          </Pressable>
          <ThemedText style={styles.name}>{user.displayName}</ThemedText>
          <ThemedText style={styles.level}>
            {user.level.title} LVL {user.level.level}
          </ThemedText>
          {user.bio.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.bio}>
              {user.bio}
            </ThemedText>
          )}
          <View style={styles.xpRow}>
            <View style={styles.flex}>
              <ProgressBar progress={user.level.progress} height={8} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {user.level.xp.toLocaleString()}
              {user.level.nextLevelXp ? ` / ${user.level.nextLevelXp.toLocaleString()}` : ''} XP
            </ThemedText>
          </View>
          <View style={styles.follows}>
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
            {user.streak.current > 0 && <ThemedText type="smallBold">🔥 {user.streak.current} days</ThemedText>}
          </View>
        </Reveal>

        <Reveal index={1}>
          <View style={styles.countries}>
            {stats.countryProgress.map((country) => (
              <View key={country.country} style={styles.country}>
                <ThemedText style={styles.flag}>{COUNTRY_LABELS[country.country].flag}</ThemedText>
                <View>
                  <ThemedText type="smallBold">{COUNTRY_LABELS[country.country].name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {country.percent}%
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </Reveal>

        <Reveal index={2}>
          <Card style={styles.statsCard}>
            <StatRow
              items={[
                { value: stats.challengesCompleted, label: 'challenges' },
                { value: stats.placesVisited, label: 'places' },
                { value: stats.countriesVisited, label: 'countries' },
              ]}
            />
            <View style={styles.statsDivider} />
            <StatRow
              items={[
                { value: `${stats.kmExplored} km`, label: 'explored' },
                { value: stats.photos, label: 'photos' },
              ]}
            />
          </Card>
        </Reveal>

        <Reveal index={3} style={styles.section}>
          <SectionHeader
            title="Badges"
            action={
              <Pressable onPress={() => router.push('/achievements')} hitSlop={8} accessibilityRole="button">
                <ThemedText type="smallBold" style={{ color: Brand.sea }}>
                  View all
                </ThemedText>
              </Pressable>
            }
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badges} style={styles.bleed}>
            {badges.slice(0, 12).map((badge) => (
              <PressableScale key={badge.id} onPress={() => router.push('/achievements')} style={styles.badge} accessibilityLabel={badge.title}>
                <HexBadge icon={badge.icon} size={58} locked={badge.unlockedAt === null} />
                <ThemedText style={styles.badgeLabel} numberOfLines={2}>
                  {badge.title}
                </ThemedText>
              </PressableScale>
            ))}
          </ScrollView>
        </Reveal>

        <Reveal index={4} style={styles.links}>
          <LinkRow icon="trophy-outline" label="Leaderboard" onPress={() => router.push('/leaderboard')} />
          <LinkRow icon="time-outline" label="History" onPress={() => router.push('/history')} />
          <LinkRow icon="bookmark-outline" label="Saved posts" onPress={() => router.push('/saved')} />
          <LinkRow icon="diamond-outline" label="Baltic Challenges Pro" detail="€4.99/mo" onPress={() => router.push('/pro')} />
          <LinkRow icon="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
        </Reveal>
        <ThemedText style={styles.credit}>Cover photo: {BRAND_IMAGES.profileCover.credit}</ThemedText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: Spacing.five,
  },
  cover: {
    height: 190,
  },
  coverActions: {
    position: 'absolute',
    right: Spacing.three,
  },
  body: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.three + 4,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  avatarRing: {
    marginTop: -52,
    borderRadius: 54,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 800,
    marginTop: Spacing.two,
  },
  level: {
    fontSize: 14,
    fontWeight: 700,
    color: Brand.sea,
  },
  bio: {
    textAlign: 'center',
    marginTop: 4,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
  follows: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  countries: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6ECE8',
  },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flag: {
    fontSize: 24,
    lineHeight: 30,
  },
  statsCard: {
    gap: 0,
    paddingVertical: Spacing.two,
  },
  statsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E6ECE8',
    marginVertical: Spacing.one,
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
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  badgeLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 600,
    textAlign: 'center',
  },
  links: {
    borderRadius: Radius.large,
    backgroundColor: '#F7F9F8',
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E6ECE8',
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: 600,
  },
  credit: {
    fontSize: 10,
    color: '#9AA7A0',
    textAlign: 'center',
  },
});
