import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { XpLabel } from '@/components/challenge-card';
import { ChallengeMap } from '@/components/challenge-map';
import { HeroScroll } from '@/components/hero-scroll';
import { Photo } from '@/components/photo';
import { Reveal } from '@/components/reveal';
import { ErrorState, LoadingState, SectionHeader } from '@/components/screen';
import { StatRow } from '@/components/stat-row';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Glyph } from '@/components/ui/glyph';
import { HexBadge } from '@/components/ui/hex-badge';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Tag } from '@/components/ui/tag';
import { Brand, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAbandonChallenge, useChallenge, useCompleteChallenge, useStartChallenge } from '@/hooks/queries';
import { useReport } from '@/hooks/social-queries';
import { useLiveDistance } from '@/hooks/use-live-distance';
import { showAlert } from '@/lib/dialog';
import { formatDistance, formatNumber, levelTitle, monthName } from '@/lib/format';
import { categoryGlyph, collectionGlyph, rewardGlyph } from '@/lib/glyphs';
import { i18n, useT } from '@/lib/i18n';
import { pickImage } from '@/lib/images';
import { askReportReason, reportReceived } from '@/lib/moderation-actions';
import { registerForPushNotifications } from '@/lib/notifications';
import type { ChallengeDetail, CompletionResult } from '@/lib/types';


function openDirections(challenge: ChallengeDetail) {
  if (!challenge.place) return;
  const { lat, lng, name } = challenge.place;
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  void Linking.openURL(url);
}

/** Walking time below 8 km, driving time above. */
function estimate(meters: number | null) {
  if (meters === null) return '—';
  const minutes = meters < 8000 ? meters / 80 : meters / 1000;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  return `${Math.floor(minutes / 60)} h ${Math.round(minutes % 60)} min`;
}

// ── Detail ──────────────────────────────────────────────────────────────────

function InfoItem({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoIcon}>
        <Icon name={icon} size={16} color={Brand.sea} />
      </View>
      <View style={styles.flex}>
        <ThemedText style={styles.infoLabel}>{label}</ThemedText>
        <ThemedText style={styles.infoValue}>{value}</ThemedText>
      </View>
    </View>
  );
}

function SafetyInfo({ safety }: { safety: NonNullable<ChallengeDetail['safety']> }) {
  const t = useT();
  const yesNo = (value: boolean | null) => (value === null ? '—' : value ? t('common.yes') : t('common.no'));
  const season =
    safety.seasonMonths.length === 12 ? t('challenge.allYear') : safety.seasonMonths.map((month) => monthName(month)).join(', ');
  return (
    <Card style={styles.safety}>
      {safety.temporarilyClosed && <Tag label={t('challenge.closed')} icon="warning" tone="red" />}
      <View style={styles.infoGrid}>
        <InfoItem icon="trail-sign-outline" label={t('challenge.terrain')} value={safety.terrain ?? '—'} />
        <InfoItem icon="calendar-outline" label={t('challenge.season')} value={season} />
        <InfoItem icon="people-outline" label={t('challenge.family')} value={yesNo(safety.familyFriendly)} />
        <InfoItem icon="paw-outline" label={t('challenge.dog')} value={yesNo(safety.dogFriendly)} />
        <InfoItem icon="car-outline" label={t('challenge.parking')} value={yesNo(safety.parking)} />
        <InfoItem icon="accessibility-outline" label={t('challenge.accessibility')} value={safety.accessibility ?? '—'} />
      </View>
      <View style={styles.notice}>
        <Icon name="leaf-outline" size={16} color={Brand.sea} />
        <ThemedText type="small" style={styles.noticeText}>
          {t('challenge.notice')}
        </ThemedText>
      </View>
    </Card>
  );
}

function DetailView({
  data,
  onStart,
  starting,
  onResume,
  feedback,
}: {
  data: ChallengeDetail;
  onStart: () => void;
  starting: boolean;
  onResume: () => void;
  feedback: string | null;
}) {
  const report = useReport();
  const t = useT();
  const where = [data.place?.city, data.country && t(`countries.${data.country}`)].filter(Boolean).join(', ');

  const footer =
    data.userStatus === null ? (
      <Button label={t('challenge.start')} icon="flag-outline" loading={starting} onPress={onStart} />
    ) : data.userStatus === 'in_progress' ? (
      <Button label={t('challenge.resume')} icon="navigate" onPress={onResume} />
    ) : null;

  return (
    <HeroScroll
      image={data.imageUrl}
      fallback={categoryGlyph(data.categoryId)}
      credit={data.imageCredit}
      footer={footer}
      actions={<IconButton icon="map-outline" label={t('challenge.directions')} onPress={() => openDirections(data)} />}>
      <Reveal>
        <ThemedText style={styles.title}>{data.title}</ThemedText>
        {where.length > 0 && (
          <View style={styles.location}>
            <Icon name="location-outline" size={15} color="#6B7A72" />
            <ThemedText type="small" themeColor="textSecondary">
              {where}
            </ThemedText>
          </View>
        )}
      </Reveal>

      <Reveal index={1} style={styles.tags}>
        <Tag label={data.categoryName} tone="green" />
        <Tag label={t(`difficulty.${data.difficulty}.name`)} tone="blue" />
        <View style={styles.flex} />
        <Tag label={t('common.xp', { xp: data.xpReward })} icon="star" tone="amber" />
      </Reveal>

      <Reveal index={2}>
        <StatRow
          items={[
            { value: data.explorers, label: t('challenge.explorers') },
            { value: formatDistance(data.distanceM) ?? '—', label: t('challenge.away') },
            {
              value: data.safety?.estimatedDurationMin ? t('challenge.minutes', { count: data.safety.estimatedDurationMin }) : '—',
              label: t('challenge.duration'),
            },
            { value: formatDistance(data.place?.radiusM) ?? '—', label: t('challenge.radius') },
          ]}
        />
      </Reveal>

      <Reveal index={3}>
        <ThemedText style={styles.description}>{data.description}</ThemedText>
      </Reveal>

      {data.userStatus === 'completed' && (
        <Card style={styles.statusDone}>
          <View style={styles.statusRow}>
            <Icon name="checkmark-circle" size={22} color={Brand.success} />
            <ThemedText type="smallBold">{t('challenge.youCompleted')}</ThemedText>
          </View>
        </Card>
      )}
      {data.userStatus === 'flagged' && (
        <Card style={styles.statusReview}>
          <View style={styles.statusRow}>
            <Icon name="time-outline" size={22} color={Brand.amber} />
            <ThemedText type="smallBold">{t('challenge.underReview')}</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {t('challenge.underReviewBody')}
          </ThemedText>
        </Card>
      )}
      {feedback && (
        <Card style={styles.statusError}>
          <ThemedText type="small">{feedback}</ThemedText>
        </Card>
      )}

      {data.place && (
        <PressableScale onPress={() => router.push({ pathname: '/place/[id]', params: { id: data.place!.id } })} style={styles.placeLink}>
          <Photo uri={data.imageUrl} fallback={categoryGlyph(data.categoryId)} style={styles.placeThumb} />
          <View style={styles.flex}>
            <ThemedText type="smallBold">{data.place.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('challenge.otherHere')}
            </ThemedText>
          </View>
          <Icon name="chevron-forward" size={18} color="#6B7A72" />
        </PressableScale>
      )}

      {data.collections.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title={t('challenge.partOf')} />
          <View style={styles.tags}>
            {data.collections.map((collection) => (
              <PressableScale
                key={collection.slug}
                onPress={() => router.push({ pathname: '/collection/[slug]', params: { slug: collection.slug } })}
                style={styles.collectionChip}>
                <Glyph name={collectionGlyph(collection.slug)} size={16} color={Brand.sea} />
                <ThemedText type="smallBold">{collection.title}</ThemedText>
              </PressableScale>
            ))}
          </View>
        </View>
      )}

      {data.safety && (
        <View style={styles.section}>
          <SectionHeader title={t('challenge.beforeYouGo')} />
          <SafetyInfo safety={data.safety} />
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        style={styles.reportLink}
        onPress={async () => {
          const reason = await askReportReason('challenge');
          if (reason) report.mutate({ targetType: 'challenge', targetId: data.id, reason }, { onSuccess: reportReceived });
        }}>
        <Icon name="flag-outline" size={14} color="#8A9790" />
        <ThemedText type="small" style={styles.reportText}>
          {t('challenge.report')}
        </ThemedText>
      </Pressable>
    </HeroScroll>
  );
}

// ── GPS challenge mode ─────────────────────────────────────────────────────

function GpsMode({
  data,
  onVerify,
  onDetails,
}: {
  data: ChallengeDetail;
  onVerify: () => void;
  onDetails: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const abandon = useAbandonChallenge(data.id);
  const live = useLiveDistance(data.place, true);
  const radius = data.place?.radiusM ?? 150;
  const distance = live.distance ?? data.distanceM;
  const inRange = live.distance !== null && live.distance <= radius;
  const approach = distance === null ? 0.05 : Math.max(0.05, Math.min(1, 1 - (distance - radius) / 5000));

  return (
    <View style={styles.gpsScreen}>
      <ChallengeMap
        challenges={[data]}
        userCoords={live.coords}
        selectedId={data.id}
        onSelect={() => undefined}
        routeTo={data.place ? { lat: data.place.lat, lng: data.place.lng } : null}
        dark
      />

      <View style={[styles.gpsTop, { paddingTop: insets.top + Spacing.two }]} pointerEvents="box-none">
        <View style={styles.gpsTopRow}>
          <IconButton icon="chevron-back" label={t('common.back')} onPress={() => router.back()} background="rgba(20,32,26,0.85)" color="#FFFFFF" />
          <View style={styles.gpsHeader}>
            <View style={styles.gpsHeaderIcon}>
              <Glyph name={categoryGlyph(data.categoryId)} size={22} color="#FFFFFF" />
            </View>
            <View style={styles.flex}>
              <ThemedText style={styles.gpsTitle} numberOfLines={1}>
                {data.place?.name ?? data.title}
              </ThemedText>
              <ThemedText style={styles.gpsDistance}>
                {live.distance === null ? t('challenge.locating') : inRange ? t('challenge.youAreHere') : formatDistance(live.distance)}
              </ThemedText>
            </View>
          </View>
        </View>
        <View style={styles.gpsProgress}>
          <View style={styles.flex}>
            <ProgressBar progress={inRange ? 1 : approach} color="#4ADE80" track="rgba(255,255,255,0.25)" height={8} />
          </View>
          <ThemedText style={styles.gpsCount}>{inRange ? '1 / 1' : '0 / 1'}</ThemedText>
        </View>
      </View>

      <Animated.View entering={FadeInUp} style={[styles.gpsSheet, { paddingBottom: insets.bottom + Spacing.three }]}>
        {inRange && (
          <Animated.View entering={FadeIn.duration(250)} style={styles.found}>
            <Icon name="location" size={16} color="#FFFFFF" />
            <ThemedText style={styles.foundText}>{t('challenge.found')}</ThemedText>
          </Animated.View>
        )}
        <View style={styles.checkpoint}>
          <Photo uri={data.imageUrl} fallback={categoryGlyph(data.categoryId)} style={styles.checkpointPhoto} />
          <View style={styles.flex}>
            <ThemedText type="small" themeColor="textSecondary">
              {t('challenge.nextCheckpoint')}
            </ThemedText>
            <ThemedText style={styles.checkpointTitle} numberOfLines={2}>
              {data.place?.name ?? data.title}
            </ThemedText>
          </View>
        </View>
        <View style={styles.gpsStats}>
          <View style={styles.gpsStat}>
            <Icon name="navigate-outline" size={18} color={Brand.sea} />
            <View>
              <ThemedText style={styles.gpsStatValue}>{formatDistance(distance) ?? '—'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('challenge.distance')}
              </ThemedText>
            </View>
          </View>
          <View style={styles.gpsStat}>
            <Icon name="walk-outline" size={18} color={Brand.sea} />
            <View>
              <ThemedText style={styles.gpsStatValue}>{estimate(distance)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('challenge.estimated')}
              </ThemedText>
            </View>
          </View>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {t('challenge.withinRadius', { radius: formatDistance(radius) })}
          {live.accuracy !== null ? ` · ${t('challenge.accuracy', { m: Math.round(live.accuracy) })}` : ''}
        </ThemedText>
        <Button label={inRange ? t('challenge.continue') : t('challenge.imHere')} icon={inRange ? 'checkmark' : 'locate'} onPress={onVerify} />
        <Button label={t('challenge.openMap')} icon="map-outline" variant="outline" onPress={() => openDirections(data)} />
        <View style={styles.gpsLinks}>
          <Pressable onPress={onDetails} hitSlop={8} accessibilityRole="button">
            <ThemedText type="smallBold" style={{ color: Brand.sea }}>
              {t('challenge.details')}
            </ThemedText>
          </Pressable>
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            onPress={() =>
              showAlert(t('challenge.giveUpTitle'), t('challenge.giveUpBody'), [
                { text: t('challenge.keepGoing'), style: 'cancel' },
                { text: t('challenge.giveUp'), style: 'destructive', onPress: () => abandon.mutate(undefined, { onSuccess: onDetails }) },
              ])
            }>
            <ThemedText type="smallBold" style={{ color: '#8A9790' }}>
              {t('challenge.giveUp')}
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

// ── Photo verification ─────────────────────────────────────────────────────

function PhotoStep({
  data,
  submitting,
  onSubmit,
  onBack,
  feedback,
}: {
  data: ChallengeDetail;
  submitting: boolean;
  onSubmit: (photoUri: string | null) => void;
  onBack: () => void;
  feedback: string | null;
}) {
  const t = useT();
  const [photo, setPhoto] = useState<string | null>(null);
  const take = async (source: 'camera' | 'library') => {
    const uri = await pickImage(source).catch(() => null);
    if (uri) setPhoto(uri);
  };

  return (
    <SafeAreaView style={styles.photoScreen} edges={['top', 'bottom']}>
      <View style={styles.photoHeader}>
        <IconButton icon="chevron-back" label={t('common.back')} onPress={onBack} background="#F0F4F1" />
      </View>
      <View style={styles.photoBody}>
        <Reveal>
          <ThemedText style={styles.photoTitle}>{t('challenge.photoTitle')}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            {t('challenge.photoSubtitle')}
          </ThemedText>
        </Reveal>
        <Animated.View entering={FadeIn.duration(300)} style={styles.photoFrame}>
          {photo ? (
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <Photo uri={data.imageUrl} fallback={categoryGlyph(data.categoryId)} style={StyleSheet.absoluteFill}>
              <View style={styles.photoHint}>
                <Icon name="camera-outline" size={16} color="#FFFFFF" />
                <ThemedText style={styles.photoHintText}>{data.place?.name}</ThemedText>
              </View>
            </Photo>
          )}
        </Animated.View>
        {feedback && (
          <Card style={styles.statusError}>
            <ThemedText type="small">{feedback}</ThemedText>
          </Card>
        )}
        <View style={styles.photoActions}>
          {photo ? (
            <>
              <Button label={t('challenge.complete')} icon="checkmark-circle" loading={submitting} onPress={() => onSubmit(photo)} />
              <Button label={t('challenge.retake')} icon="refresh" variant="outline" disabled={submitting} onPress={() => take('camera')} />
            </>
          ) : (
            <>
              <Button label={t('challenge.takePhoto')} icon="camera" onPress={() => take('camera')} />
              <Button label={t('challenge.upload')} icon="image-outline" variant="outline" onPress={() => take('library')} />
              <Pressable onPress={() => onSubmit(null)} disabled={submitting} accessibilityRole="button" style={styles.skip}>
                <ThemedText type="smallBold" style={{ color: Brand.sea }}>
                  {submitting ? t('challenge.verifying') : t('challenge.skip')}
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Celebration ────────────────────────────────────────────────────────────


function Celebration({
  result,
  challenge,
  photoUri,
}: {
  result: Extract<CompletionResult, { status: 'completed' }>;
  challenge: ChallengeDetail;
  photoUri: string | null;
}) {
  const t = useT();
  const done = () => {
    registerForPushNotifications({ prompt: true }).catch(() => undefined);
    router.navigate('/');
  };
  return (
    <SafeAreaView style={styles.celebrateScreen} edges={['top', 'bottom']}>
      <View style={styles.celebrate}>
        <Animated.View entering={ZoomIn.duration(320)}>
          <HexBadge glyph={result.leveledUp ? 'arrow-up-bold' : categoryGlyph(challenge.categoryId)} size={110} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(150)} style={styles.centerBlock}>
          <ThemedText style={styles.celebrateTitle}>{result.leveledUp ? t('challenge.levelUp', { level: result.level.level }) : t('challenge.completeTitle')}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            {result.leveledUp ? t('challenge.nowA', { title: levelTitle(result.level.title) }) : challenge.title}
          </ThemedText>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(250).duration(300)} style={styles.xpBurst}>
          <Icon name="star" size={22} color={Brand.amber} />
          <ThemedText style={styles.xpBurstText}>{t('common.xp', { xp: result.xpEarned })}</ThemedText>
        </Animated.View>
        {result.streak > 1 && (
          <Animated.View entering={FadeInDown.delay(400)}>
            <Tag label={t('challenge.streak', { count: result.streak })} icon="flame" tone="amber" />
          </Animated.View>
        )}
        <Animated.View entering={FadeInDown.delay(450)} style={styles.levelBox}>
          <View style={styles.levelRow}>
            <ThemedText type="smallBold">
              {t('common.levelTitle', { title: levelTitle(result.level.title), level: result.level.level })}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {result.level.nextLevelXp
                ? t('common.xpProgress', { xp: formatNumber(result.level.xp), next: formatNumber(result.level.nextLevelXp) })
                : t('common.xpTotal', { xp: formatNumber(result.level.xp) })}
            </ThemedText>
          </View>
          <ProgressBar progress={result.level.progress} color={Brand.amber} height={10} />
        </Animated.View>
        {result.unlocked.map((reward, index) => (
          <Animated.View key={`${reward.kind}-${reward.id}`} entering={FadeInDown.delay(600 + index * 120)} style={styles.reward}>
            <HexBadge glyph={rewardGlyph(reward.kind, reward.id)} size={40} />
            <View style={styles.flex}>
              <ThemedText type="small" themeColor="textSecondary">
                {t(`challenge.rewards.${reward.kind}`)}
              </ThemedText>
              <ThemedText type="smallBold">{reward.kind === 'daily' ? t('goals.today') : reward.title}</ThemedText>
            </View>
            {reward.xp > 0 && <XpLabel xp={reward.xp} />}
          </Animated.View>
        ))}
      </View>
      <View style={styles.celebrateActions}>
        <Button
          label={t('challenge.share')}
          icon="share-social-outline"
          onPress={() =>
            router.push({
              pathname: '/new-post',
              params: { challengeId: challenge.id, challengeTitle: challenge.title, photoUri: photoUri ?? undefined },
            })
          }
        />
        <Button variant="outline" label={t('challenge.findNext')} onPress={done} />
      </View>
    </SafeAreaView>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

type Mode = 'detail' | 'gps' | 'photo';

export default function ChallengeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenge = useChallenge(id);
  const challengeId = challenge.data?.id ?? id;
  const start = useStartChallenge(challengeId);
  const complete = useCompleteChallenge(challengeId);
  const [mode, setMode] = useState<Mode | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);


  if (challenge.isPending) return <LoadingState />;
  if (challenge.isError) return <ErrorState error={challenge.error} onRetry={() => challenge.refetch()} />;
  const data = challenge.data;
  // Until the user switches views, a challenge that is already running opens straight into GPS mode.
  const view: Mode = mode ?? (data.userStatus === 'in_progress' ? 'gps' : 'detail');

  if (complete.data?.status === 'completed') return <Celebration result={complete.data} challenge={data} photoUri={photoUri} />;

  async function handleStart() {
    setFeedback(null);
    try {
      await start.mutateAsync();
      setMode('gps');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : i18n.t('challenge.startFailed'));
    }
  }

  async function handleComplete(photo: string | null) {
    setFeedback(null);
    setPhotoUri(photo);
    try {
      const result = await complete.mutateAsync({ photoUri: photo });
      if (result.status !== 'completed') setFeedback(result.message);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : i18n.t('challenge.verifyFailed'));
    }
  }

  if (view === 'photo' && data.userStatus === 'in_progress') {
    return (
      <PhotoStep
        data={data}
        submitting={complete.isPending}
        onSubmit={handleComplete}
        onBack={() => setMode('gps')}
        feedback={feedback}
      />
    );
  }
  if (view === 'gps' && data.userStatus === 'in_progress') {
    return <GpsMode data={data} onVerify={() => setMode('photo')} onDetails={() => setMode('detail')} />;
  }
  return <DetailView data={data} onStart={handleStart} starting={start.isPending} onResume={() => setMode('gps')} feedback={feedback} />;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
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
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#3B4A42',
  },
  section: {
    gap: Spacing.three,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statusDone: {
    backgroundColor: '#EAF7F0',
  },
  statusReview: {
    backgroundColor: '#FFF6E8',
  },
  statusError: {
    backgroundColor: '#FDECEC',
  },
  placeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two + 2,
    borderRadius: Radius.large,
    backgroundColor: '#F5F8F6',
  },
  placeThumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.medium,
  },
  collectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Brand.mint,
  },
  safety: {
    gap: Spacing.three,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.three,
  },
  infoItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingRight: Spacing.two,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#7C8A83',
    fontWeight: 600,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: 700,
  },
  notice: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: '#F2F8F4',
    padding: Spacing.two + 2,
    borderRadius: Radius.small,
  },
  noticeText: {
    flex: 1,
    color: '#3F5248',
  },
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.three,
  },
  reportText: {
    color: '#8A9790',
  },
  // GPS mode
  gpsScreen: {
    flex: 1,
    backgroundColor: '#1B2420',
  },
  gpsTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  gpsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  gpsHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    padding: Spacing.two,
    borderRadius: Radius.large,
    backgroundColor: 'rgba(20,32,26,0.85)',
  },
  gpsHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsHeaderEmoji: {
    fontSize: 20,
    lineHeight: 26,
  },
  gpsTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 800,
  },
  gpsDistance: {
    color: '#C9D8D0',
    fontSize: 14,
    fontWeight: 600,
  },
  gpsProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  gpsCount: {
    color: '#FFFFFF',
    fontWeight: 800,
  },
  gpsSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: Spacing.three + 4,
    gap: Spacing.three,
    ...Shadow.floating,
  },
  found: {
    position: 'absolute',
    top: -18,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.success,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    ...Shadow.floating,
  },
  foundText: {
    color: '#FFFFFF',
    fontWeight: 800,
    letterSpacing: 0.6,
  },
  checkpoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DCE4DF',
  },
  checkpointPhoto: {
    width: 60,
    height: 60,
    borderRadius: Radius.medium,
  },
  checkpointTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: 800,
  },
  gpsStats: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  gpsStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  gpsStatValue: {
    fontSize: 17,
    fontWeight: 800,
  },
  gpsLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  // Photo step
  photoScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  photoHeader: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  photoBody: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  photoTitle: {
    fontSize: 24,
    fontWeight: 800,
    textAlign: 'center',
    marginBottom: 4,
  },
  photoFrame: {
    flex: 1,
    minHeight: 240,
    maxHeight: 420,
    borderRadius: Radius.large,
    overflow: 'hidden',
    backgroundColor: Brand.mint,
  },
  photoHint: {
    position: 'absolute',
    left: Spacing.three,
    bottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,25,18,0.6)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
  },
  photoHintText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 700,
  },
  photoActions: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  // Celebration
  celebrateScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  celebrate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  centerBlock: {
    alignItems: 'center',
    gap: 4,
  },
  celebrateTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 800,
    textAlign: 'center',
  },
  xpBurst: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF4E2',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  xpBurstText: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 800,
    color: '#C47F1E',
  },
  levelBox: {
    width: '100%',
    gap: Spacing.two,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reward: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two + 2,
    borderRadius: Radius.large,
    backgroundColor: '#F5F8F6',
  },
  celebrateActions: {
    gap: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
