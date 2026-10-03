import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { XpLabel } from '@/components/challenge-card';
import { Photo } from '@/components/photo';
import { ThemedText } from '@/components/themed-text';
import { Flag } from '@/components/ui/glyph';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';
import { collectionGlyph } from '@/lib/glyphs';
import { useT } from '@/lib/i18n';
import type { Collection } from '@/lib/types';

function CollectionRowBase({ collection }: { collection: Collection }) {
  const t = useT();
  const done = collection.completedAt !== null;
  const progress = collection.total ? collection.completed / collection.total : 0;
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/collection/[slug]', params: { slug: collection.slug } })}
      accessibilityLabel={`${collection.title}, ${collection.completed} of ${collection.total}`}
      style={styles.card}>
      <Photo uri={collection.imageUrl} fallback={collectionGlyph(collection.slug)} style={styles.photo}>
        {collection.country && (
          <View style={styles.flag}>
            <Flag country={collection.country} width={20} />
          </View>
        )}
      </Photo>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {collection.title}
          </ThemedText>
          {collection.isPro && (
            <View style={styles.pro}>
              <ThemedText style={styles.proText}>{t('collections.pro')}</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.titleRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {collection.completed} / {collection.total}
          </ThemedText>
          {done ? (
            <View style={styles.doneRow}>
              <Icon name="checkmark-circle" size={14} color={Brand.success} />
              <ThemedText type="smallBold" style={{ color: Brand.success }}>
                {t('common.done')}
              </ThemedText>
            </View>
          ) : (
            <XpLabel xp={collection.xpReward} />
          )}
        </View>
        <ProgressBar progress={progress} height={6} color={done ? Brand.success : Brand.sea} />
      </View>
    </PressableScale>
  );
}

export const CollectionRow = memo(CollectionRowBase);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two + 2,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.large,
    ...Shadow.card,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: Radius.medium,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: 800,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  flag: {
    position: 'absolute',
    left: 4,
    bottom: 4,
  },
  pro: {
    backgroundColor: Brand.amber,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  proText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 800,
  },
});
