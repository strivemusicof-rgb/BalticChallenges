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
import { COUNTRY_LABELS, DIFFICULTY_LABELS, formatDistance } from '@/lib/format';
import { pickImage } from '@/lib/images';
import { askReportReason, reportReceived } from '@/lib/moderation-actions';
import { registerForPushNotifications } from '@/lib/notifications';
import type { ChallengeDetail, CompletionResult, UnlockedReward } from '@/lib/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
  const yesNo = (value: boolean | null) => (value === null ? '—' : value ? 'Yes' : 'No');
  const season = safety.seasonMonths.length === 12 ? 'All year' : safety.seasonMonths.map((month) => MONTHS[month - 1]).join(', ');
  return (
    <Card style={styles.safety}>
      {safety.temporarilyClosed && <Tag label="Temporarily closed" icon="warning" tone="red" />}
      <View style={styles.infoGrid}>
        <InfoItem icon="trail-sign-outline" label="Terrain" value={safety.terrain ?? '—'} />
        <InfoItem icon="calendar-outline" label="Season" value={season} />
        <InfoItem icon="people-outline" label="Family friendly" value={yesNo(safety.familyFriendly)} />
        <InfoItem icon="paw-outline" label="Dog friendly" value={yesNo(safety.dogFriendly)} />
        <InfoItem icon="car-outline" label="Parking" value={yesNo(safety.parking)} />
        <InfoItem icon="accessibility-outline" label="Accessibility" value={safety.accessibility ?? '—'} />
      </View>
      <View style={styles.notice}>
        <Icon name="leaf-outline" size={16} color={Brand.sea} />
        <ThemedText type="small" style={styles.noticeText}>
          Always follow local rules and site guidance. Respect nature and leave places as you found them.
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
  const difficulty = DIFFICULTY_LABELS[data.difficulty];
  const where = [data.place?.city, data.country && COUNTRY_LABELS[data.country].name].filter(Boolean).join(', ');

  const footer =
    data.userStatus === null ? (
      <Button label="Start Challenge" icon="flag-outline" loading={starting} onPress={onStart} />
    ) : data.userStatus === 'in_progress' ? (
      <Button label="Resume challenge" icon="navigate" onPress={onResume} />
    ) : null;

  return (
    <HeroScroll
      image={data.imageUrl}
      fallback={data.icon}
      credit={data.imageCredit}
      footer={footer}
      actions={<IconButton icon="map-outline" label="Directions" onPress={() => openDirections(data)} />}>
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
        <Tag label={`${data.icon} ${data.categoryName}`} tone="green" />
        <Tag label={difficulty.name} tone="blue" />
        <View style={styles.flex} />
        <Tag label={`+${data.xpReward} XP`} icon="star" tone="amber" />
      </Reveal>

      <Reveal index={2}>
        <StatRow
          items={[
            { value: data.explorers, label: 'explorers' },
            { value: formatDistance(data.distanceM) ?? '—', label: 'away' },
            { value: data.safety?.estimatedDurationMin ? `${data.safety.estimatedDurationMin}m` : '—', label: 'duration' },
            { value: formatDistance(data.place?.radiusM) ?? '—', label: 'radius' },
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
            <ThemedText type="smallBold">You completed this challenge</ThemedText>
          </View>
        </Card>
      )}
      {data.userStatus === 'flagged' && (
        <Card style={styles.statusReview}>
          <View style={styles.statusRow}>
            <Icon name="time-outline" size={22} color={Brand.amber} />
            <ThemedText type="smallBold">Your completion is being reviewed</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            We double-check unusual check-ins to keep leaderboards fair. XP is added once approved.
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
          <Photo uri={data.imageUrl} fallback={data.icon} style={styles.placeThumb} />
          <View style={styles.flex}>
            <ThemedText type="smallBold">{data.place.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Other challenges and photos from explorers
            </ThemedText>
          </View>
          <Icon name="chevron-forward" size={18} color="#6B7A72" />
        </PressableScale>
      )}

      {data.collections.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Part of" />
          <View style={styles.tags}>
            {data.collections.map((collection) => (
              <PressableScale
                key={collection.slug}
                onPress={() => router.push({ pathname: '/collection/[slug]', params: { slug: collection.slug } })}
                style={styles.collectionChip}>
                <ThemedText type="smallBold">
                  {collection.icon} {collection.title}
                </ThemedText>
              </PressableScale>
            ))}
          </View>
        </View>
      )}

      {data.safety && (
        <View style={styles.section}>
          <SectionHeader title="Before you go" />
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
          Report wrong or unsafe info
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
          <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} background="rgba(20,32,26,0.85)" color="#FFFFFF" />
          <View style={styles.gpsHeader}>
            <View style={styles.gpsHeaderIcon}>
              <ThemedText style={styles.gpsHeaderEmoji}>{data.icon}</ThemedText>
            </View>
            <View style={styles.flex}>
              <ThemedText style={styles.gpsTitle} numberOfLines={1}>
                {data.place?.name ?? data.title}
              </ThemedText>
              <ThemedText style={styles.gpsDistance}>
                {live.distance === null ? 'Locating you…' : inRange ? 'You are here' : formatDistance(live.distance)}
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

      <Animated.View entering={FadeInUp.springify().damping(18)} style={[styles.gpsSheet, { paddingBottom: insets.bottom + Spacing.three }]}>
        {inRange && (
          <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.found}>
            <Icon name="location" size={16} color="#FFFFFF" />
            <ThemedText style={styles.foundText}>CHECKPOINT FOUND!</ThemedText>
          </Animated.View>
        )}
        <View style={styles.checkpoint}>
          <Photo uri={data.imageUrl} fallback={data.icon} style={styles.checkpointPhoto} />
          <View style={styles.flex}>
            <ThemedText type="small" themeColor="textSecondary">
              Next checkpoint
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
                distance
              </ThemedText>
            </View>
          </View>
          <View style={styles.gpsStat}>
            <Icon name="walk-outline" size={18} color={Brand.sea} />
            <View>
              <ThemedText style={styles.gpsStatValue}>{estimate(distance)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                estimated
              </ThemedText>
            </View>
          </View>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Get within {formatDistance(radius)} to complete
          {live.accuracy !== null ? ` · GPS ±${Math.round(live.accuracy)} m` : ''}
        </ThemedText>
        <Button label={inRange ? 'Continue' : "I'm here — verify"} icon={inRange ? 'checkmark' : 'locate'} onPress={onVerify} />
        <Button label="Open Map" icon="map-outline" variant="outline" onPress={() => openDirections(data)} />
        <View style={styles.gpsLinks}>
          <Pressable onPress={onDetails} hitSlop={8} accessibilityRole="button">
            <ThemedText type="smallBold" style={{ color: Brand.sea }}>
              Challenge details
            </ThemedText>
          </Pressable>
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            onPress={() =>
              showAlert('Give up this challenge?', 'You can start it again any time.', [
                { text: 'Keep going', style: 'cancel' },
                { text: 'Give up', style: 'destructive', onPress: () => abandon.mutate(undefined, { onSuccess: onDetails }) },
              ])
            }>
            <ThemedText type="smallBold" style={{ color: '#8A9790' }}>
              Give up
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
  const [photo, setPhoto] = useState<string | null>(null);
  const take = async (source: 'camera' | 'library') => {
    const uri = await pickImage(source).catch(() => null);
    if (uri) setPhoto(uri);
  };

  return (
    <SafeAreaView style={styles.photoScreen} edges={['top', 'bottom']}>
      <View style={styles.photoHeader}>
        <IconButton icon="chevron-back" label="Back" onPress={onBack} background="#F0F4F1" />
      </View>
      <View style={styles.photoBody}>
        <Reveal>
          <ThemedText style={styles.photoTitle}>Take a photo</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            Capture the location and complete the challenge.
          </ThemedText>
        </Reveal>
        <Animated.View entering={FadeIn.duration(300)} style={styles.photoFrame}>
          {photo ? (
            <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <Photo uri={data.imageUrl} fallback={data.icon} style={StyleSheet.absoluteFill}>
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
              <Button label="Complete challenge" icon="checkmark-circle" loading={submitting} onPress={() => onSubmit(photo)} />
              <Button label="Retake" icon="refresh" variant="outline" disabled={submitting} onPress={() => take('camera')} />
            </>
          ) : (
            <>
              <Button label="Take Photo" icon="camera" onPress={() => take('camera')} />
              <Button label="Upload from Gallery" icon="image-outline" variant="outline" onPress={() => take('library')} />
              <Pressable onPress={() => onSubmit(null)} disabled={submitting} accessibilityRole="button" style={styles.skip}>
                <ThemedText type="smallBold" style={{ color: Brand.sea }}>
                  {submitting ? 'Verifying…' : 'Skip photo and complete'}
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

const REWARD_LABEL: Record<UnlockedReward['kind'], string> = {
  achievement: 'Badge unlocked',
  collection: 'Collection complete',
  goal: 'Goal complete',
  daily: 'Daily bonus',
};

function Celebration({
  result,
  challenge,
  photoUri,
}: {
  result: Extract<CompletionResult, { status: 'completed' }>;
  challenge: ChallengeDetail;
  photoUri: string | null;
}) {
  const done = () => {
    registerForPushNotifications({ prompt: true }).catch(() => undefined);
    router.navigate('/');
  };
  return (
    <SafeAreaView style={styles.celebrateScreen} edges={['top', 'bottom']}>
      <View style={styles.celebrate}>
        <Animated.View entering={ZoomIn.springify().damping(9)}>
          <HexBadge icon={result.leveledUp ? '⬆️' : challenge.icon} size={110} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(150)} style={styles.centerBlock}>
          <ThemedText style={styles.celebrateTitle}>{result.leveledUp ? `Level ${result.level.level}!` : 'Challenge complete!'}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            {result.leveledUp ? `You are now a ${result.level.title}.` : challenge.title}
          </ThemedText>
        </Animated.View>
        <Animated.View entering={ZoomIn.delay(300).springify()} style={styles.xpBurst}>
          <Icon name="star" size={22} color={Brand.amber} />
          <ThemedText style={styles.xpBurstText}>+{result.xpEarned} XP</ThemedText>
        </Animated.View>
        {result.streak > 1 && (
          <Animated.View entering={FadeInDown.delay(400)}>
            <Tag label={`🔥 ${result.streak}-day streak`} tone="amber" />
          </Animated.View>
        )}
        <Animated.View entering={FadeInDown.delay(450)} style={styles.levelBox}>
          <View style={styles.levelRow}>
            <ThemedText type="smallBold">
              LVL {result.level.level} {result.level.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {result.level.xp.toLocaleString()}
              {result.level.nextLevelXp ? ` / ${result.level.nextLevelXp.toLocaleString()}` : ''} XP
            </ThemedText>
          </View>
          <ProgressBar progress={result.level.progress} color={Brand.amber} height={10} />
        </Animated.View>
        {result.unlocked.map((reward, index) => (
          <Animated.View key={`${reward.kind}-${reward.id}`} entering={FadeInDown.delay(600 + index * 120)} style={styles.reward}>
            <HexBadge icon={reward.icon} size={40} />
            <View style={styles.flex}>
              <ThemedText type="small" themeColor="textSecondary">
                {REWARD_LABEL[reward.kind]}
              </ThemedText>
              <ThemedText type="smallBold">{reward.title}</ThemedText>
            </View>
            {reward.xp > 0 && <XpLabel xp={reward.xp} />}
          </Animated.View>
        ))}
      </View>
      <View style={styles.celebrateActions}>
        <Button
          label="Share this adventure"
          icon="share-social-outline"
          onPress={() =>
            router.push({
              pathname: '/new-post',
              params: { challengeId: challenge.id, challengeTitle: challenge.title, photoUri: photoUri ?? undefined },
            })
          }
        />
        <Button variant="outline" label="Find next challenge" onPress={done} />
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
      setFeedback(error instanceof Error ? error.message : 'Could not start the challenge');
    }
  }

  async function handleComplete(photo: string | null) {
    setFeedback(null);
    setPhotoUri(photo);
    try {
      const result = await complete.mutateAsync({ photoUri: photo });
      if (result.status !== 'completed') setFeedback(result.message);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not verify your location');
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
