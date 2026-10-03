import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Reveal } from '@/components/reveal';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Glyph } from '@/components/ui/glyph';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { formatNumber, levelTitle } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { LEVEL_REWARDS } from '@/lib/levels';
import { useCurrentUser } from '@/providers/auth-provider';

/** What each level unlocks, with the player's progress towards the next reward. */
export default function LevelsScreen() {
  const t = useT();
  const user = useCurrentUser();
  const level = user.level.level;

  return (
    <Screen edges={['bottom']}>
      <View style={styles.header}>
        <Avatar name={user.displayName} url={user.avatarUrl} size={72} level={level} />
        <View style={styles.flex}>
          <ThemedText style={styles.title}>{t('common.levelTitle', { title: levelTitle(user.level.title), level })}</ThemedText>
          <ProgressBar progress={user.level.progress} color={Brand.amber} height={8} />
          <ThemedText type="small" themeColor="textSecondary">
            {user.level.nextLevelXp
              ? t('common.xpProgress', { xp: formatNumber(user.level.xp), next: formatNumber(user.level.nextLevelXp) })
              : t('common.xpTotal', { xp: formatNumber(user.level.xp) })}
          </ThemedText>
        </View>
      </View>

      {LEVEL_REWARDS.map((reward, index) => {
        const unlocked = level >= reward.level;
        return (
          <Reveal key={`${reward.key}-${reward.level}`} index={index}>
            <View style={[styles.row, unlocked && styles.rowUnlocked]}>
              <View style={[styles.levelBadge, unlocked && styles.levelBadgeUnlocked]}>
                <ThemedText style={[styles.levelText, unlocked && styles.levelTextUnlocked]}>{reward.level}</ThemedText>
              </View>
              {reward.frame ? (
                <Avatar name={user.displayName} url={user.avatarUrl} size={36} level={reward.frame.level} />
              ) : (
                <View style={styles.icon}>
                  <Glyph name={reward.glyph} size={22} color={unlocked ? Brand.sea : '#9AA7A0'} />
                </View>
              )}
              <View style={styles.flex}>
                <ThemedText type="smallBold">
                  {reward.frame ? t(`levelRewards.frame.${reward.frame.key}`) : t(`levelRewards.${reward.key}`)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {reward.frame ? t('levelRewards.frameBody') : t(`levelRewards.${reward.key}Body`)}
                </ThemedText>
              </View>
              <Glyph name={unlocked ? 'check-circle' : 'lock-outline'} size={22} color={unlocked ? Brand.success : '#B4C0BA'} />
            </View>
          </Reveal>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  flex: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: '#F7F9F8',
    opacity: 0.75,
  },
  rowUnlocked: {
    opacity: 1,
    backgroundColor: '#F1F8F4',
  },
  levelBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E3E9E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeUnlocked: {
    backgroundColor: Brand.sea,
  },
  levelText: {
    fontSize: 13,
    fontWeight: 800,
    color: '#6B7A72',
  },
  levelTextUnlocked: {
    color: '#FFFFFF',
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
