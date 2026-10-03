import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Glyph } from '@/components/ui/glyph';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useCommunityGoals } from '@/hooks/queries';
import { formatNumber } from '@/lib/format';
import { eventColors } from '@/lib/glyphs';
import { useT } from '@/lib/i18n';

function useGoal(slug: string) {
  return useCommunityGoals().data?.find((goal) => goal.slug === slug);
}

/** One line for the Home event banner (white on the event gradient). */
export function CommunityGoalLine({ slug }: { slug: string }) {
  const t = useT();
  const goal = useGoal(slug);
  if (!goal) return null;
  const reached = goal.reachedAt !== null;
  return (
    <View style={styles.line}>
      <View style={styles.lineHeader}>
        <Glyph name={reached ? 'check-decagram' : 'account-group'} size={15} color="#FFFFFF" />
        <ThemedText style={styles.lineText} numberOfLines={1}>
          {reached
            ? t('communityGoal.reachedShort')
            : t('communityGoal.together', { progress: formatNumber(goal.progress), goal: formatNumber(goal.goal) })}
        </ThemedText>
      </View>
      <ProgressBar progress={Math.min(goal.progress / goal.goal, 1)} color="#FFE7A8" track="rgba(255,255,255,0.25)" height={5} />
    </View>
  );
}

/** Card on the event page: shared progress, how many took part, what you added and the reward. */
export function CommunityGoalCard({ slug }: { slug: string }) {
  const t = useT();
  const goal = useGoal(slug);
  if (!goal) return null;
  const reached = goal.reachedAt !== null;
  const [from] = eventColors(slug);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.icon, { backgroundColor: from }]}>
          <Glyph name="account-group" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <ThemedText type="smallBold">{t('communityGoal.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('communityGoal.participants', { count: goal.participants })}
          </ThemedText>
        </View>
        <ThemedText style={styles.count}>
          {formatNumber(goal.progress)}
          <ThemedText style={styles.countGoal}> / {formatNumber(goal.goal)}</ThemedText>
        </ThemedText>
      </View>
      <ProgressBar progress={Math.min(goal.progress / goal.goal, 1)} color={reached ? Brand.success : from} height={10} />
      <ThemedText type="small" themeColor="textSecondary">
        {reached ? t('communityGoal.reached', { xp: goal.rewardXp }) : t('communityGoal.reward', { xp: goal.rewardXp })}
      </ThemedText>
      {goal.mine > 0 && (
        <ThemedText type="smallBold" style={{ color: Brand.sea }}>
          {t('communityGoal.mine', { count: goal.mine })}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  line: {
    gap: 5,
    marginTop: 2,
  },
  lineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lineText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 700,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: '#F5F8F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 20,
    fontWeight: 800,
  },
  countGoal: {
    fontSize: 14,
    fontWeight: 700,
    color: '#8A9790',
  },
});
