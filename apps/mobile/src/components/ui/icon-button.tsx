import { StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Shadow } from '@/constants/theme';

/** Round floating button used over photos and maps (back, like, locate). */
export function IconButton({
  icon,
  onPress,
  label,
  color = '#15211B',
  background = 'rgba(255,255,255,0.94)',
  size = 38,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  background?: string;
  size?: number;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={8}
      scaleTo={0.9}
      style={[styles.button, { width: size, height: size, borderRadius: size / 2, backgroundColor: background }]}>
      <Icon name={icon} size={size * 0.52} color={color} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
});
