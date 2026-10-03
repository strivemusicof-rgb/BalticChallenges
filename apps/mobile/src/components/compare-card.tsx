import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Flag } from '@/components/ui/glyph';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useProfile } from '@/hooks/queries';
import { formatNumber } from '@/lib/format';
import { useT } from '@/lib/i18n';
import type { Stats } from '@/lib/types';

function Row({ label, mine, theirs }: { label: string; mine: number; theirs: number }) {
  const lead = mine === theirs ? null : mine > theirs ? 'me' : 'them';
  return (
    <View style={styles.row}>
      <ThemedText style={[styles.value, lead === 'me' && styles.lead]}>{formatNumber(mine)}</ThemedText>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <ThemedText style={[styles.value, styles.right, lead === 'them' && styles.lead]}>{formatNumber(theirs)}</ThemedText>
    </View>
  );
}

/** Side-by-side progress of the signed-in player and another explorer. */
export function CompareCard({
  name,
  avatarUrl,
  xp,
  stats,
}: {
  name: string;
  avatarUrl: string | null;
  xp: number;
  stats: Stats;
}) {
  const t = useT();
  const me = useProfile();
  if (!me.data) return null;
  const mine = me.data.stats;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.person}>
          <Avatar name={me.data.user.displayName} url={me.data.user.avatarUrl} size={36} />
          <ThemedText type="smallBold">{t('common.you')}</ThemedText>
        </View>
        <ThemedText style={styles.vs}>{t('user.vs')}</ThemedText>
        <View style={[styles.person, styles.personRight]}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
            {name}
          </ThemedText>
          <Avatar name={name} url={avatarUrl} size={36} />
        </View>
      </View>
      <Row label="XP" mine={me.data.user.level.xp} theirs={xp} />
      <Row label={t('profile.challenges')} mine={mine.challengesCompleted} theirs={stats.challengesCompleted} />
      <Row label={t('profile.places')} mine={mine.placesVisited} theirs={stats.placesVisited} />
      <Row label={t('profile.badges')} mine={mine.achievementsUnlocked} theirs={stats.achievementsUnlocked} />
      {mine.countryProgress.map((country) => {
        const theirs = stats.countryProgress.find((item) => item.country === country.country)?.percent ?? 0;
        return (
          <View key={country.country} style={styles.row}>
            <ThemedText style={[styles.value, country.percent > theirs && styles.lead]}>{country.percent}%</ThemedText>
            <View style={styles.flagLabel}>
              <Flag country={country.country} width={18} />
              <ThemedText style={styles.label}>{t(`countries.${country.country}`)}</ThemedText>
            </View>
            <ThemedText style={[styles.value, styles.right, theirs > country.percent && styles.lead]}>{theirs}%</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    backgroundColor: '#F7F9F8',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  person: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  personRight: {
    justifyContent: 'flex-end',
  },
  name: {
    flexShrink: 1,
  },
  vs: {
    fontSize: 12,
    fontWeight: 800,
    color: '#8A9790',
    marginHorizontal: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    width: 64,
    fontSize: 16,
    fontWeight: 800,
    color: '#5E6D65',
  },
  right: {
    textAlign: 'right',
  },
  lead: {
    color: Brand.sea,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: '#6B7A72',
    fontWeight: 600,
  },
  flagLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
