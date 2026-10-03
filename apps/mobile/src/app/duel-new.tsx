import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Screen, SectionHeader } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Glyph } from '@/components/ui/glyph';
import { Segmented } from '@/components/ui/segmented';
import { Brand, Spacing } from '@/constants/theme';
import { useCreateDuel } from '@/hooks/social-queries';
import { showAlert } from '@/lib/dialog';
import { useT } from '@/lib/i18n';
import type { Duel } from '@/lib/types';

const METRICS = ['challenges', 'places', 'xp'] as const;
const DAYS = ['3', '7', '14', '30'] as const;

/** Pick what to compete on and for how long, then send the duel to a friend. */
export default function NewDuelScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ opponentId: string; name: string; avatarUrl?: string; level?: string }>();
  const create = useCreateDuel();
  const [metric, setMetric] = useState<Duel['metric']>('challenges');
  const [days, setDays] = useState<(typeof DAYS)[number]>('7');

  function send() {
    create.mutate(
      { opponentId: params.opponentId, metric, days: Number(days) },
      {
        onSuccess: () => {
          router.back();
          router.push('/duels');
        },
        onError: (error) => showAlert(t('common.somethingWrong'), error.message),
      },
    );
  }

  return (
    <Screen edges={['bottom']}>
      <View style={styles.header}>
        <Glyph name="sword-cross" size={28} color={Brand.sea} />
        <Avatar name={params.name} url={params.avatarUrl || null} size={56} level={Number(params.level) || undefined} />
        <ThemedText style={styles.title}>{t('duels.challengeName', { name: params.name })}</ThemedText>
      </View>
      <SectionHeader title={t('duels.whatToCompete')} />
      <Segmented options={METRICS.map((id) => ({ id, label: t(`duels.metric.${id}`) }))} value={metric} onChange={setMetric} />
      <SectionHeader title={t('duels.howLong')} />
      <Segmented options={DAYS.map((id) => ({ id, label: t('duels.days', { count: Number(id) }) }))} value={days} onChange={setDays} />
      <ThemedText type="small" themeColor="textSecondary">
        {t('duels.rules', { xp: 100 })}
      </ThemedText>
      <Button label={t('duels.send')} icon="paper-plane-outline" loading={create.isPending} onPress={send} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    textAlign: 'center',
  },
});
