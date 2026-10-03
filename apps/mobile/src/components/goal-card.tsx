import { StyleSheet, View } from 'react-native';

import { XpLabel } from '@/components/challenge-card';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { HexBadge } from '@/components/ui/hex-badge';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Brand, Spacing } from '@/constants/theme';
import { timeLeft } from '@/lib/format';
import type { Goal } from '@/lib/types';

export function GoalCard({ goal, onPress }: { goal: Goal; onPress?: () => void }) {
  const done = goal.completedAt !== null;
  return (
    <Card onPress={onPress} style={[styles.card, done && styles.done]}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <ThemedText style={styles.kicker}>{goal.period === 'weekly' ? 'Weekly Challenge' : 'Monthly Challenge'}</ThemedText>
          <ThemedText style={styles.title}>{goal.description || goal.title}</ThemedText>
        </View>
        <HexBadge icon={goal.icon} size={44} locked={!done && goal.current === 0} />
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <ProgressBar progress={goal.current / goal.target} color={done ? Brand.success : Brand.amber} height={8} />
        </View>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {Math.min(goal.current, goal.target)}/{goal.target}
        </ThemedText>
      </View>
      <View style={styles.row}>
        <XpLabel xp={goal.xpReward} />
        <View style={styles.status}>
          <Icon name={done ? 'checkmark-circle' : 'time-outline'} size={14} color={done ? Brand.success : '#6B7A72'} />
          <ThemedText type="small" style={{ color: done ? Brand.success : '#6B7A72' }}>
            {done ? 'Completed' : timeLeft(goal.endsAt)}
          </ThemedText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two + 2,
  },
  done: {
    borderWidth: 1.5,
    borderColor: '#BFE3CF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  kicker: {
    fontSize: 15,
    fontWeight: 800,
  },
  title: {
    fontSize: 14,
    lineHeight: 19,
    color: '#5E6D65',
    marginTop: 2,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
