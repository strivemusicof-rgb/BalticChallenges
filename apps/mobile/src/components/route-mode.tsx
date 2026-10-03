import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChallengeMap } from '@/components/challenge-map';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Glyph } from '@/components/ui/glyph';
import { IconButton } from '@/components/ui/icon-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Brand, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { showAlert } from '@/lib/dialog';
import { formatDistance } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useRouteRecorder, type RoutePoint } from '@/lib/route-recorder';
import type { ChallengeDetail } from '@/lib/types';

function KeepAwake() {
  useKeepAwake();
  return null;
}

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Records a walk or ride for distance challenges and submits the track when finished. */
export function RouteMode({
  data,
  submitting,
  onFinish,
  onDetails,
}: {
  data: ChallengeDetail;
  submitting: boolean;
  onFinish: (points: RoutePoint[]) => void;
  onDetails: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const recorder = useRouteRecorder();
  const [now, setNow] = useState(() => Date.now());
  const targetM = (data.requirements.distanceKm ?? 1) * 1000;

  useEffect(() => {
    if (!recorder.recording) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [recorder.recording]);

  const elapsed = recorder.startedAt ? now - recorder.startedAt : 0;
  const reached = recorder.distance >= targetM;
  const last = recorder.points.at(-1);

  async function begin() {
    const ok = await recorder.start();
    if (!ok) showAlert(t('route.needLocation'), t('home.locationWhy'));
  }

  function finish() {
    recorder.stop();
    onFinish(recorder.points);
  }

  return (
    <View style={styles.screen}>
      {recorder.recording && <KeepAwake />}
      <ChallengeMap
        challenges={[data]}
        userCoords={last ? { lat: last.lat, lng: last.lng } : null}
        selectedId={data.id}
        onSelect={() => undefined}
        routeTo={data.place ? { lat: data.place.lat, lng: data.place.lng } : null}
        dark
      />
      <View style={[styles.top, { paddingTop: insets.top + Spacing.two }]} pointerEvents="box-none">
        <IconButton icon="chevron-back" label={t('common.back')} onPress={() => router.back()} background="rgba(20,32,26,0.85)" color="#FFFFFF" />
      </View>

      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {data.title}
        </ThemedText>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <ThemedText style={styles.value}>{formatDistance(recorder.distance) ?? '0 m'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('route.of', { target: formatDistance(targetM) })}
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText style={styles.value}>{clock(elapsed)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('route.time')}
            </ThemedText>
          </View>
        </View>
        <ProgressBar progress={recorder.distance / targetM} color={reached ? Brand.success : Brand.sea} height={10} />
        <View style={styles.hint}>
          <Glyph name="information-outline" size={16} color={Brand.sea} />
          <ThemedText type="small" style={styles.hintText}>
            {recorder.recording ? t('route.keepOpen') : t('route.startHint', { place: data.place?.name ?? '' })}
          </ThemedText>
        </View>
        {recorder.recording ? (
          <Button
            label={reached ? t('route.finish') : t('route.finishEarly')}
            icon="flag"
            variant={reached ? 'primary' : 'outline'}
            loading={submitting}
            onPress={finish}
          />
        ) : (
          <Button label={t('route.start')} icon="play" loading={submitting} onPress={() => void begin()} />
        )}
        <Button variant="ghost" label={t('challenge.details')} onPress={onDetails} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1B2420',
  },
  top: {
    position: 'absolute',
    left: Spacing.three,
    top: 0,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: Spacing.three + 4,
    gap: Spacing.three,
    ...Shadow.floating,
  },
  title: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: 800,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  stat: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: '#F5F8F6',
  },
  value: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 800,
  },
  hint: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  hintText: {
    flex: 1,
    color: '#3F5248',
  },
});
