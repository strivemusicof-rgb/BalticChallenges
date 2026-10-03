import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Radius } from '@/constants/theme';

const TONES = {
  green: { bg: '#E7F2EC', fg: '#1E5E46' },
  blue: { bg: '#E6F0FB', fg: '#2F6FC4' },
  amber: { bg: '#FFF2DD', fg: '#B86E0C' },
  grey: { bg: '#F0F3F1', fg: '#4F5E56' },
  red: { bg: '#FDECEC', fg: '#C23B3B' },
} as const;

export function Tag({ label, icon, tone = 'grey' }: { label: string; icon?: IconName; tone?: keyof typeof TONES }) {
  const colors = TONES[tone];
  return (
    <View style={[styles.tag, { backgroundColor: colors.bg }]}>
      {icon && <Icon name={icon} size={12} color={colors.fg} />}
      <Text style={[styles.label, { color: colors.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
  },
});
