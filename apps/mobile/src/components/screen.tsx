import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Glyph } from '@/components/ui/glyph';
import { Icon } from '@/components/ui/icon';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { GlyphName } from '@/lib/glyphs';
import { useT } from '@/lib/i18n';

interface ScreenProps {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Kept for call sites; the tab bar no longer overlaps content. */
  tabScreen?: boolean;
  edges?: Edge[];
  /** Remove the default side padding (for full-bleed hero layouts). */
  bleed?: boolean;
}

export function Screen({ children, refreshing = false, onRefresh, edges = ['top'], bleed = false }: ScreenProps) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, bleed && styles.bleed]}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.sea} /> : undefined}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Large left-aligned page title used at the top of tab screens. */
export function PageTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.pageTitle}>
      <ThemedText style={styles.pageTitleText}>{title}</ThemedText>
      {right}
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  onPress,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Shows a chevron ("see all") and makes the header tappable. */
  onPress?: () => void;
}) {
  const theme = useTheme();
  const body = (
    <View style={styles.sectionHeader}>
      <View style={styles.flex}>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {action}
      {onPress && !action && <Icon name="chevron-forward" size={20} color={theme.textSecondary} />}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={6}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function LoadingState() {
  return (
    <View style={styles.state}>
      <ActivityIndicator size="large" color={Brand.sea} />
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useT();
  const message = error instanceof Error ? error.message : t('common.somethingWrong');
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Glyph name="compass-off-outline" size={30} color={Brand.sea} />
      </View>
      <ThemedText style={styles.stateText}>{message}</ThemedText>
      {onRetry && <Button label={t('common.retry')} variant="secondary" onPress={onRetry} />}
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: GlyphName; title: string; body?: string }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Glyph name={icon} size={30} color={Brand.sea} />
      </View>
      <ThemedText type="smallBold" style={styles.stateText}>
        {title}
      </ThemedText>
      {body && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.stateText}>
          {body}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + 4,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  bleed: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  flex: {
    flex: 1,
  },
  pageTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  pageTitleText: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 800,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 800,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.three,
  },
  stateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    textAlign: 'center',
  },
});
