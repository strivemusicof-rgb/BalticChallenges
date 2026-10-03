import { StyleSheet, View, type PressableProps, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CardProps extends ViewProps {
  onPress?: PressableProps['onPress'];
  style?: StyleProp<ViewStyle>;
  /** Flat cards use a hairline border instead of a shadow (for dense lists). */
  flat?: boolean;
}

export function Card({ onPress, style, flat = false, children, ...rest }: CardProps) {
  const theme = useTheme();
  const surface = [
    styles.card,
    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
    flat ? styles.flat : Shadow.card,
    style,
  ];
  if (!onPress) {
    return (
      <View style={surface} {...rest}>
        {children}
      </View>
    );
  }
  return (
    <PressableScale onPress={onPress} style={surface} {...rest}>
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  flat: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
