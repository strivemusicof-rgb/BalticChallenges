import { StyleSheet, Text } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Brand, Radius, Spacing } from '@/constants/theme';

export function Chip({
  label,
  selected,
  onPress,
  compact = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      scaleTo={0.94}
      style={[styles.chip, compact && styles.compact, { backgroundColor: selected ? Brand.sea : '#F0F4F1' }]}>
      <Text style={[styles.label, compact && styles.compactLabel, { color: selected ? '#FFFFFF' : '#33433A' }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  compact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
  },
  compactLabel: {
    fontSize: 13,
  },
});
