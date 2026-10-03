import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

// Short ease-out fade with a few pixels of upward travel: calm, no overshoot.
const TIMING = { duration: 260, easing: Easing.out(Easing.cubic) };

/** Fades content in when it first mounts; `index` adds a small stagger for the first few siblings. */
export function Reveal({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(Math.min(index, 4) * 40, withTiming(1, TIMING)));
  }, [index, progress]);
  const animated = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * 8 }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
