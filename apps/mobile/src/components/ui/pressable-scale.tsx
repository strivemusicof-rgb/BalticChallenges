import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESS = { duration: 120, easing: Easing.out(Easing.quad) };

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** How far the element shrinks while pressed. */
  scaleTo?: number;
}

/** A pressable that eases down slightly while touched. The animation runs on the UI thread. */
export function PressableScale({ style, children, scaleTo = 0.98, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPressIn={(event) => {
        scale.set(withTiming(scaleTo, PRESS));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withTiming(1, PRESS));
        onPressOut?.(event);
      }}
      style={[style, animated]}
      {...rest}>
      {children}
    </AnimatedPressable>
  );
}
