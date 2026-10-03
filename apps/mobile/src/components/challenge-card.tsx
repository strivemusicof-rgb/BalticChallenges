import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Photo } from '@/components/photo';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatDistance } from '@/lib/format';
import { categoryGlyph } from '@/lib/glyphs';
import { i18n, useT } from '@/lib/i18n';
import type { ChallengeSummary } from '@/lib/types';

const STATUS = {
  completed: { label: 'common.completed', color: Brand.success, icon: 'checkmark-circle' },
  in_progress: { label: 'common.inProgress', color: Brand.sky, icon: 'navigate' },
  flagged: { label: 'common.inReview', color: Brand.amber, icon: 'time' },
} as const;

function StatusBadge({ status }: { status: ChallengeSummary['userStatus'] }) {
  if (!status) return null;
  const { label, color, icon } = STATUS[status];
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Icon name={icon} size={12} color="#FFFFFF" />
      <ThemedText style={styles.badgeText}>{i18n.t(label)}</ThemedText>
    </View>
  );
}

export function XpLabel({ xp, color = Brand.amber, size = 13 }: { xp: number; color?: string; size?: number }) {
  return (
    <View style={styles.xp}>
      <Icon name="star" size={size} color={Brand.amber} />
      <ThemedText style={[styles.xpText, { color, fontSize: size }]}>{i18n.t('common.xp', { xp })}</ThemedText>
    </View>
  );
}

function ChallengeCardBase({ challenge, compact = false }: { challenge: ChallengeSummary; compact?: boolean }) {
  const t = useT();
  const distance = formatDistance(challenge.distanceM);
  const where = [challenge.place?.city, challenge.country && t(`countries.${challenge.country}`)].filter(Boolean).join(', ');
  const open = () => router.push({ pathname: '/challenge/[id]', params: { id: challenge.id } });

  if (compact) {
    return (
      <PressableScale
        onPress={open}
        accessibilityLabel={`${challenge.title}, ${challenge.xpReward} XP`}
        style={[styles.card, styles.compact]}>
        <Photo uri={challenge.imageUrl} fallback={categoryGlyph(challenge.categoryId)} style={styles.photoTop}>
          <View style={styles.badgeSlot}>
            <StatusBadge status={challenge.userStatus} />
          </View>
        </Photo>
        <View style={styles.compactBody}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
            {challenge.title}
          </ThemedText>
          <View style={styles.metaRow}>
            <XpLabel xp={challenge.xpReward} />
            {distance && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
                {distance}
              </ThemedText>
            )}
          </View>
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={open}
      accessibilityLabel={`${challenge.title}, ${challenge.xpReward} XP${distance ? `, ${distance} away` : ''}`}
      style={[styles.card, styles.row]}>
      <Photo uri={challenge.imageUrl} fallback={categoryGlyph(challenge.categoryId)} style={styles.photoSide} />
      <View style={styles.rowBody}>
        <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
          {challenge.title}
        </ThemedText>
        <View style={styles.metaRow}>
          <Icon name="location-outline" size={13} color="#6B7A72" />
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={[styles.meta, styles.flex]}>
            {[where, distance].filter(Boolean).join(' · ') || challenge.categoryName}
          </ThemedText>
        </View>
        <View style={styles.footer}>
          <XpLabel xp={challenge.xpReward} />
          <StatusBadge status={challenge.userStatus} />
        </View>
      </View>
    </PressableScale>
  );
}

export const ChallengeCard = memo(ChallengeCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.large,
    ...Shadow.card,
  },
  compact: {
    width: 168,
  },
  photoTop: {
    height: 104,
    width: '100%',
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
  },
  compactBody: {
    padding: Spacing.two + 2,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    padding: Spacing.two,
    gap: Spacing.three,
    alignItems: 'center',
  },
  photoSide: {
    width: 84,
    height: 84,
    borderRadius: Radius.medium,
  },
  rowBody: {
    flex: 1,
    gap: 4,
    paddingRight: Spacing.two,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    fontSize: 13,
  },
  flex: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  xp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  xpText: {
    fontWeight: 700,
  },
  badgeSlot: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 700,
  },
});
