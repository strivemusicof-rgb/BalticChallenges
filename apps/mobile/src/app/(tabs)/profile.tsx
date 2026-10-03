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
import { Glyph , Flag } from '@/components/ui/glyph';
import { HexBadge } from '@/components/ui/hex-badge';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAchievements, useProfile } from '@/hooks/queries';
import { BRAND_IMAGES } from '@/lib/brand-images';

import { formatNumber, levelTitle } from '@/lib/format';
import { achievementGlyph } from '@/lib/glyphs';
import { STATS_LEVEL } from '@/lib/levels';
import { useT } from '@/lib/i18n';

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
  const t = useT();
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
          <IconButton icon="settings-outline" label={t('profile.settings')} onPress={() => router.push('/settings')} />
        </View>
      </View>

      <View style={styles.body}>
        <Reveal style={styles.header}>
          <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel={t('profile.editProfile')} style={styles.avatarRing}>
            <Avatar name={user.displayName} url={user.avatarUrl} size={96} level={user.level.level} />
          </Pressable>
          <ThemedText style={styles.name}>{user.displayName}</ThemedText>
          <ThemedText style={styles.level}>
            {t('common.levelTitle', { title: levelTitle(user.level.title), level: user.level.level })}
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
              {user.level.nextLevelXp
                ? t('common.xpProgress', { xp: formatNumber(user.level.xp), next: formatNumber(user.level.nextLevelXp) })
                : t('common.xpTotal', { xp: formatNumber(user.level.xp) })}
            </ThemedText>
          </View>
          <View style={styles.follows}>
            <Pressable onPress={() => router.push({ pathname: '/follows', params: { id: user.id, direction: 'followers' } })}>
              <ThemedText type="small" themeColor="textSecondary">
                <ThemedText type="smallBold">{stats.followers}</ThemedText> {t('profile.followers')}
              </ThemedText>
            </Pressable>
            <Pressable onPress={() => router.push({ pathname: '/follows', params: { id: user.id, direction: 'following' } })}>
              <ThemedText type="small" themeColor="textSecondary">
                <ThemedText type="smallBold">{stats.following}</ThemedText> {t('profile.following')}
              </ThemedText>
            </Pressable>
            {user.streak.current > 0 && (
              <View style={styles.streak}>
                <Glyph name="fire" size={16} color="#D9822B" />
                <ThemedText type="smallBold">{t('profile.streakDays', { count: user.streak.current })}</ThemedText>
              </View>
            )}
          </View>
        </Reveal>

        <Reveal index={1}>
          <View style={styles.countries}>
            {stats.countryProgress.map((country) => (
              <View key={country.country} style={styles.country}>
                <Flag country={country.country} width={24} />
                <View>
                  <ThemedText type="smallBold">{t(`countries.${country.country}`)}</ThemedText>
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
                { value: stats.challengesCompleted, label: t('profile.challenges') },
                { value: stats.placesVisited, label: t('profile.places') },
                { value: stats.countriesVisited, label: t('profile.countries') },
              ]}
            />
            <View style={styles.statsDivider} />
            <StatRow
              items={[
                { value: t('profile.km', { km: formatNumber(stats.kmExplored) }), label: t('profile.explored') },
                { value: stats.photos, label: t('profile.photos') },
              ]}
            />
          </Card>
        </Reveal>

        <Reveal index={2}>
          {user.level.level >= STATS_LEVEL ? (
            <Card style={styles.statsCard}>
              <StatRow
                items={[
                  { value: user.streak.longest, label: t('profile.bestStreak') },
                  { value: stats.collectionsCompleted, label: t('profile.collectionsDone') },
                  { value: stats.achievementsUnlocked, label: t('profile.badges') },
                ]}
              />
            </Card>
          ) : (
            <PressableScale onPress={() => router.push('/levels')} style={styles.lockedStats}>
              <Icon name="lock-closed-outline" size={18} color="#8A9790" />
              <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                {t('profile.statsLocked', { level: STATS_LEVEL })}
              </ThemedText>
            </PressableScale>
          )}
        </Reveal>

        <Reveal index={3} style={styles.section}>
          <SectionHeader
            title={t('collections.badges')}
            action={
              <Pressable onPress={() => router.push('/achievements')} hitSlop={8} accessibilityRole="button">
                <ThemedText type="smallBold" style={{ color: Brand.sea }}>
                  {t('common.viewAll')}
                </ThemedText>
              </Pressable>
            }
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badges} style={styles.bleed}>
            {badges.slice(0, 12).map((badge) => (
              <PressableScale key={badge.id} onPress={() => router.push('/achievements')} style={styles.badge} accessibilityLabel={badge.title}>
                <HexBadge glyph={achievementGlyph(badge.id)} size={58} locked={badge.unlockedAt === null} />
                <ThemedText style={styles.badgeLabel} numberOfLines={2}>
                  {badge.title}
                </ThemedText>
              </PressableScale>
            ))}
          </ScrollView>
        </Reveal>

        <Reveal index={4} style={styles.links}>
          {user.role === 'admin' && (
            <LinkRow icon="shield-checkmark-outline" label={t('profile.admin')} onPress={() => router.push('/admin')} />
          )}
          <LinkRow icon="star-outline" label={t('profile.levelRewards')} onPress={() => router.push('/levels')} />
          <LinkRow icon="flash-outline" label={t('profile.duels')} onPress={() => router.push('/duels')} />
          <LinkRow icon="trophy-outline" label={t('profile.leaderboard')} onPress={() => router.push('/leaderboard')} />
          <LinkRow icon="time-outline" label={t('profile.history')} onPress={() => router.push('/history')} />
          <LinkRow icon="bookmark-outline" label={t('profile.saved')} onPress={() => router.push('/saved')} />
          <LinkRow icon="diamond-outline" label={t('profile.pro')} detail={t('profile.proPrice')} onPress={() => router.push('/pro')} />
          <LinkRow icon="settings-outline" label={t('profile.settings')} onPress={() => router.push('/settings')} />
        </Reveal>
        <ThemedText style={styles.credit}>{t('profile.coverCredit', { credit: BRAND_IMAGES.profileCover.credit })}</ThemedText>
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
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lockedStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: '#F7F9F8',
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
