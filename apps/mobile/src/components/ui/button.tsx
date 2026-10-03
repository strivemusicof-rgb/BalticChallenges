import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale, type PressableScaleProps } from '@/components/ui/pressable-scale';
import { Brand, Radius, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'light' | 'danger';

export interface ButtonProps extends Omit<PressableScaleProps, 'style' | 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  icon?: IconName;
  size?: 'regular' | 'small';
  style?: StyleProp<ViewStyle>;
  textColor?: string;
}

const PALETTE: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: Brand.sea, fg: '#FFFFFF' },
  secondary: { bg: Brand.mint, fg: Brand.sea },
  outline: { bg: '#FFFFFF', fg: Brand.sea, border: Brand.sea },
  ghost: { bg: 'transparent', fg: Brand.sea },
  light: { bg: '#FFFFFF', fg: Brand.seaDeep },
  danger: { bg: '#FDECEC', fg: Brand.danger },
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  icon,
  size = 'regular',
  disabled,
  style,
  textColor,
  ...rest
}: ButtonProps) {
  const colors = PALETTE[variant];
  const foreground = textColor ?? colors.fg;
  const isDisabled = Boolean(disabled || loading);
  return (
    <PressableScale
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={[
        styles.base,
        size === 'small' && styles.small,
        { backgroundColor: colors.bg, opacity: disabled ? 0.5 : 1 },
        colors.border ? { borderWidth: 1.5, borderColor: colors.border } : null,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon} size={size === 'small' ? 16 : 19} color={foreground} />}
          <Text style={[styles.label, size === 'small' && styles.smallLabel, { color: foreground }]}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    minHeight: 38,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    fontSize: 16,
    fontWeight: 700,
  },
  smallLabel: {
    fontSize: 14,
  },
});
