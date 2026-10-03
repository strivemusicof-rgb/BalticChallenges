import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Brand, Radius } from '@/constants/theme';

const SPRING = { damping: 20, stiffness: 260, mass: 0.7 };

interface SegmentedProps<T extends string> {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** "pill": green pill on a grey track. "underline": text tabs with a sliding underline. */
  variant?: 'pill' | 'underline';
}

/** Tab switcher with an indicator that slides between options. */
export function Segmented<T extends string>({ options, value, onChange, variant = 'pill' }: SegmentedProps<T>) {
  const pill = variant === 'pill';
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((option) => option.id === value));
  const segment = options.length > 0 ? width / options.length : 0;
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.set(withSpring(index * segment, SPRING));
  }, [index, segment, offset]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  const onLayout = (event: LayoutChangeEvent) => {
    const inner = event.nativeEvent.layout.width - (pill ? 8 : 0);
    if (Math.abs(inner - width) < 0.5) return;
    offset.set(index * (inner / options.length));
    setWidth(inner);
  };

  return (
    <View style={pill ? styles.track : styles.underlineTrack} onLayout={onLayout} accessibilityRole="tablist">
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            pill ? styles.pill : styles.underline,
            { width: pill ? segment : segment * 0.6, left: pill ? 4 : segment * 0.2 },
            indicator,
          ]}
        />
      )}
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.id)}
            style={pill ? styles.option : styles.underlineOption}>
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                pill
                  ? { color: selected ? '#FFFFFF' : '#5F6E66' }
                  : { color: selected ? Brand.sea : '#7C8A83', fontWeight: selected ? 700 : 600 },
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: '#F0F4F1',
    borderRadius: Radius.pill,
    padding: 4,
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: Radius.pill,
    backgroundColor: Brand.sea,
  },
  option: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  underlineTrack: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DCE4DF',
  },
  underline: {
    position: 'absolute',
    bottom: -1,
    height: 3,
    borderRadius: 2,
    backgroundColor: Brand.sea,
  },
  underlineOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
  },
});
