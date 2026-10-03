import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CommunityGoalLine } from '@/components/community-goal';
import { ThemedText } from '@/components/themed-text';
import { Glyph } from '@/components/ui/glyph';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useCollections } from '@/hooks/queries';
import { timeLeft } from '@/lib/format';
import { collectionGlyph, eventColors } from '@/lib/glyphs';
import { useT } from '@/lib/i18n';

/** Home banner for the running seasonal event (a time-limited collection). Hidden when no event is on. */
export function SeasonBanner() {
  const t = useT();
  const collections = useCollections();
  // Several events can overlap (e.g. autumn and Halloween); feature the one ending soonest.
  const event = (collections.data ?? [])
    .filter((collection) => collection.kind === 'seasonal' && collection.endsAt)
    .sort((a, b) => a.endsAt!.localeCompare(b.endsAt!))[0];
  if (!event) return null;

  const done = event.completedAt !== null;
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/collection/[slug]', params: { slug: event.slug } })}
      scaleTo={0.985}
      accessibilityLabel={event.title}
      style={styles.card}>
      <LinearGradient colors={eventColors(event.slug)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.leaf}>
        <Glyph name={collectionGlyph(event.slug)} size={110} color="rgba(255,255,255,0.16)" />
      </View>
      <View style={styles.tag}>
        <Glyph name="calendar-star" size={13} color="#FFFFFF" />
        <ThemedText style={styles.tagText}>{t('home.seasonEvent')}</ThemedText>
      </View>
      <ThemedText style={styles.title}>{event.title}</ThemedText>
      <ThemedText style={styles.body} numberOfLines={2}>
        {event.description}
      </ThemedText>
      <View style={styles.progressRow}>
        <View style={styles.flex}>
          <ProgressBar progress={event.total ? event.completed / event.total : 0} color="#FFFFFF" track="rgba(255,255,255,0.3)" height={8} />
        </View>
        <ThemedText style={styles.count}>
          {event.completed}/{event.total}
        </ThemedText>
      </View>
      <CommunityGoalLine slug={event.slug} />
      <View style={styles.footer}>
        <ThemedText style={styles.meta}>
          {done ? t('common.completed') : `${t('common.xp', { xp: event.xpReward })} · ${timeLeft(event.endsAt!)}`}
        </ThemedText>
        <Glyph name="chevron-right" size={20} color="#FFFFFF" />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large + 2,
    padding: Spacing.three,
    gap: Spacing.two,
    overflow: 'hidden',
    ...Shadow.card,
  },
  leaf: {
    position: 'absolute',
    right: -18,
    top: -14,
    transform: [{ rotate: '-18deg' }],
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: 800,
  },
  body: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 19,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  count: {
    color: '#FFFFFF',
    fontWeight: 800,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 700,
  },
});
