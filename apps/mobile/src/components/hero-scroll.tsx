import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Photo } from '@/components/photo';
import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import type { GlyphName } from '@/lib/glyphs';

interface HeroScrollProps {
  image: string | null | undefined;
  fallback?: GlyphName;
  credit?: string | null;
  height?: number;
  /** Extra buttons in the top-right corner over the photo. */
  actions?: ReactNode;
  /** Content laid over the bottom of the photo (e.g. an avatar). */
  overlay?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
}

/** Full-bleed photo header with a white sheet that slides over it; the photo parallaxes and stretches on pull. */
export function HeroScroll({ image, fallback, credit, height = 300, actions, overlay, children, refreshing = false, onRefresh, footer }: HeroScrollProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-height, 0, height], [-height / 2, 0, height * 0.45]) },
      { scale: interpolate(scrollY.value, [-height, 0], [2, 1], 'clamp') },
    ],
  }));

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" /> : undefined}
        contentContainerStyle={styles.content}>
        <Animated.View style={[{ height }, heroStyle]}>
          <Photo uri={image} fallback={fallback} style={StyleSheet.absoluteFill} />
          {credit ? (
            <ThemedText style={styles.credit} numberOfLines={1}>
              © {credit}
            </ThemedText>
          ) : null}
        </Animated.View>
        <View style={styles.sheet}>
          {overlay}
          <View style={styles.sheetInner}>{children}</View>
        </View>
      </Animated.ScrollView>

      <View style={[styles.topBar, { top: insets.top + Spacing.two }]} pointerEvents="box-none">
        <IconButton icon="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={styles.actions}>{actions}</View>
      </View>
      {footer && <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: 120,
  },
  credit: {
    position: 'absolute',
    right: Spacing.three,
    bottom: 34,
    maxWidth: '80%',
    fontSize: 10,
    lineHeight: 13,
    color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 3,
  },
  sheet: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    minHeight: 400,
  },
  sheetInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + 4,
    paddingTop: Spacing.four,
    gap: Spacing.three,
  },
  topBar: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three + 4,
    paddingTop: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.mint,
  },
});
