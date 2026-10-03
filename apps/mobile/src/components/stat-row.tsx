import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/** Evenly spaced big-number stats ("1,284 explorers · 67 photos …"). */
export function StatRow({ items }: { items: { value: number | string; label: string }[] }) {
  return (
    <View style={styles.row}>
      {items.map((item, index) => (
        <View key={item.label} style={[styles.item, index > 0 && styles.divider]}>
          <ThemedText style={styles.value}>{typeof item.value === 'number' ? item.value.toLocaleString() : item.value}</ThemedText>
          <ThemedText style={styles.label}>{item.label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: Spacing.two,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#DCE4DF',
  },
  value: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: 800,
  },
  label: {
    fontSize: 12,
    color: '#6B7A72',
    fontWeight: 500,
  },
});
