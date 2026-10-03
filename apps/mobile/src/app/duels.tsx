import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Reveal } from '@/components/reveal';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Glyph } from '@/components/ui/glyph';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Tag } from '@/components/ui/tag';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useDuelAction, useDuels } from '@/hooks/social-queries';
import { showAlert } from '@/lib/dialog';
import { formatNumber, timeLeft } from '@/lib/format';
import { useT } from '@/lib/i18n';
import type { Duel, DuelSide } from '@/lib/types';
import { useCurrentUser } from '@/providers/auth-provider';

function Side({ side, leading, align }: { side: DuelSide; leading: boolean; align: 'left' | 'right' }) {
  return (
    <View style={[styles.side, align === 'right' && styles.sideRight]}>
      <Avatar name={side.displayName} url={side.avatarUrl} size={44} level={side.level} />
      <ThemedText type="smallBold" numberOfLines={1}>
        {side.displayName}
      </ThemedText>
      <ThemedText style={[styles.score, leading && styles.leading]}>{formatNumber(side.score)}</ThemedText>
    </View>
  );
}

function DuelCard({ duel }: { duel: Duel }) {
  const t = useT();
  const me = useCurrentUser();
  const action = useDuelAction();
  const run = (kind: 'accept' | 'decline' | 'cancel') =>
    action.mutate({ id: duel.id, action: kind }, { onError: (error) => showAlert(t('common.somethingWrong'), error.message) });

  const { challenger, opponent } = duel;
  const total = Math.max(challenger.score + opponent.score, 1);
  const waitingForMe = duel.status === 'pending' && !duel.isChallenger;
  const won = duel.status === 'finished' && duel.winnerId === me.id;
  const lost = duel.status === 'finished' && duel.winnerId !== null && duel.winnerId !== me.id;

  return (
    <View style={[styles.card, waitingForMe && styles.cardHighlight]}>
      <View style={styles.cardHeader}>
        <Glyph name="sword-cross" size={18} color={Brand.sea} />
        <ThemedText type="smallBold" style={styles.flex}>
          {t(`duels.metric.${duel.metric}`)} · {t('duels.days', { count: duel.days })}
        </ThemedText>
        {duel.status === 'active' && duel.endsAt && <Tag label={timeLeft(duel.endsAt)} icon="time-outline" tone="amber" />}
        {duel.status === 'pending' && <Tag label={t('duels.pending')} tone="blue" />}
        {won && <Tag label={t('duels.won')} icon="trophy" tone="green" />}
        {lost && <Tag label={t('duels.lost')} />}
        {duel.status === 'finished' && duel.winnerId === null && <Tag label={t('duels.draw')} />}
        {(duel.status === 'declined' || duel.status === 'cancelled') && <Tag label={t(`duels.${duel.status}`)} />}
      </View>

      <View style={styles.versus}>
        <Side side={challenger} leading={challenger.score > opponent.score} align="left" />
        <ThemedText style={styles.vs}>{t('user.vs')}</ThemedText>
        <Side side={opponent} leading={opponent.score > challenger.score} align="right" />
      </View>
      {duel.status !== 'pending' && <ProgressBar progress={challenger.score / total} color={Brand.sea} track="#F2B05E" height={8} />}

      {waitingForMe && (
        <View style={styles.actions}>
          <Button label={t('duels.accept')} icon="checkmark" size="small" style={styles.flex} loading={action.isPending} onPress={() => run('accept')} />
          <Button label={t('duels.decline')} variant="secondary" size="small" style={styles.flex} onPress={() => run('decline')} />
        </View>
      )}
      {duel.status === 'pending' && duel.isChallenger && (
        <Button label={t('duels.cancel')} variant="ghost" size="small" onPress={() => run('cancel')} />
      )}
      {duel.status === 'active' && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {t('duels.prize', { xp: duel.winXp })}
        </ThemedText>
      )}
    </View>
  );
}

export default function DuelsScreen() {
  const t = useT();
  const duels = useDuels();

  if (duels.isPending) return <LoadingState />;
  if (duels.isError) return <ErrorState error={duels.error} onRetry={() => duels.refetch()} />;

  return (
    <Screen edges={['bottom']} refreshing={duels.isRefetching} onRefresh={() => void duels.refetch()}>
      <ThemedText type="small" themeColor="textSecondary">
        {t('duels.intro')}
      </ThemedText>
      {duels.data.length === 0 ? (
        <>
          <EmptyState icon="sword-cross" title={t('duels.empty')} body={t('duels.emptyBody')} />
          <Button label={t('home.findPeople')} icon="person-add-outline" variant="secondary" onPress={() => router.push('/people')} />
        </>
      ) : (
        duels.data.map((duel, index) => (
          <Reveal key={duel.id} index={index}>
            <DuelCard duel={duel} />
          </Reveal>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: '#F7F9F8',
  },
  cardHighlight: {
    borderWidth: 1.5,
    borderColor: Brand.sea,
    backgroundColor: '#F1F8F4',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  versus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 24,
    fontWeight: 800,
    color: '#5E6D65',
  },
  leading: {
    color: Brand.sea,
  },
  vs: {
    fontSize: 13,
    fontWeight: 800,
    color: '#8A9790',
    marginHorizontal: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
