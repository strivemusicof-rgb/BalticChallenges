import * as Location from 'expo-location';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { Flag } from '@/components/ui/glyph';
import { Segmented } from '@/components/ui/segmented';
import { COUNTRIES, DIFFICULTIES, DIFFICULTY_COLORS, INTEREST_IDS } from '@/lib/format';
import { currentLanguage, LANGUAGES, setLanguage, useT } from '@/lib/i18n';
import { openLegal, TERMS_VERSION } from '@/lib/legal';
import type { Country, Difficulty, User } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

const STEPS = 5;

const INTEREST_ICONS: Record<string, { icon: IconName; color: string }> = {
  nature: { icon: 'leaf', color: '#2E9E62' },
  history: { icon: 'library', color: '#4F5E56' },
  food: { icon: 'restaurant', color: '#E8892C' },
  hiking: { icon: 'walk', color: '#2E9E62' },
  architecture: { icon: 'business', color: '#2F7BD8' },
  beaches: { icon: 'umbrella', color: '#2A9D8F' },
  family: { icon: 'people', color: '#D6493F' },
  adventure: { icon: 'flame', color: '#E8892C' },
  photography: { icon: 'camera', color: '#4F5E56' },
  wildlife: { icon: 'paw', color: '#2E9E62' },
  cycling: { icon: 'bicycle', color: '#2F7BD8' },
  'road-trips': { icon: 'car-sport', color: '#1E5E46' },
};


function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function Dot({ active, done }: { active: boolean; done: boolean }) {
  const animated = useAnimatedStyle(() => ({ width: withTiming(active ? 22 : 8, { duration: 220 }) }));
  return <Animated.View style={[styles.dot, { backgroundColor: active || done ? Brand.sea : '#D5DED9' }, animated]} />;
}

function Tile({
  label,
  icon,
  color,
  country,
  selected,
  onPress,
}: {
  label: string;
  icon?: IconName;
  color?: string;
  country?: Country;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={[styles.tile, selected && styles.tileSelected]}>
      {icon ? <Icon name={icon} size={26} color={color ?? Brand.sea} /> : country ? <Flag country={country} width={34} /> : null}
      <ThemedText style={styles.tileLabel} numberOfLines={1}>
        {label}
      </ThemedText>
      {selected && (
        <View style={styles.tileCheck}>
          <Icon name="checkmark" size={11} color="#FFFFFF" />
        </View>
      )}
    </PressableScale>
  );
}

export default function OnboardingScreen() {
  const t = useT();
  const { setUser, state } = useAuth();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('explorer');
  const [countries, setCountries] = useState<Country[]>(['LV', 'LT', 'EE']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish(requestLocation: boolean) {
    setSaving(true);
    setError(null);
    try {
      // Location is optional: whatever the user answers, onboarding completes.
      if (requestLocation) await Location.requestForegroundPermissionsAsync().catch(() => undefined);
      const { user } = await api<{ user: User }>('/v1/me', {
        method: 'PATCH',
        body: { interests, difficulty, countries, completeOnboarding: true, acceptTerms: TERMS_VERSION },
      });
      setUser(user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('onboarding.saveFailed'));
      setSaving(false);
    }
  }

  const name = state.status === 'signedIn' ? state.user.displayName.split(/\s+/)[0] : '';
  const next = () => setStep((current) => Math.min(current + 1, STEPS - 1));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.top}>
          <View style={styles.back}>
            {step > 0 && <IconButton icon="chevron-back" label={t('common.back')} onPress={() => setStep(step - 1)} background="#F0F4F1" />}
          </View>
          <View style={styles.dots}>
            {Array.from({ length: STEPS }, (_, index) => (
              <Dot key={index} active={index === step} done={index < step} />
            ))}
          </View>
          <View style={styles.back} />
        </View>

        <Animated.View key={step} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={styles.body}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {step === 0 && (
              <View style={styles.centered}>
                <View style={styles.heroIcon}>
                  <Icon name="compass" size={44} color="#FFFFFF" />
                </View>
                <ThemedText style={styles.title}>{t('onboarding.welcome', { name })}</ThemedText>
                <ThemedText style={[styles.subtitle, styles.center]}>{t('onboarding.intro')}</ThemedText>
                <View style={styles.languageBlock}>
                  <ThemedText style={styles.fieldLabel}>{t('onboarding.language')}</ThemedText>
                  <Segmented
                    options={LANGUAGES.map((item) => ({ id: item.code, label: item.label }))}
                    value={currentLanguage()}
                    onChange={(next) => void setLanguage(next)}
                  />
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
                  {t('onboarding.agreePrefix')}{' '}
                  <ThemedText type="small" style={styles.link} onPress={() => openLegal('terms')}>
                    {t('onboarding.terms')}
                  </ThemedText>{' '}
                  {t('onboarding.and')}{' '}
                  <ThemedText type="small" style={styles.link} onPress={() => openLegal('privacy')}>
                    {t('onboarding.privacy')}
                  </ThemedText>
                  . {t('onboarding.safety')}
                </ThemedText>
              </View>
            )}

            {step === 1 && (
              <>
                <ThemedText style={styles.title}>{t('onboarding.interestsTitle')}</ThemedText>
                <ThemedText style={styles.subtitle}>{t('onboarding.interestsSubtitle')}</ThemedText>
                <View style={styles.grid}>
                  {INTEREST_IDS.map((interest) => {
                    const meta = INTEREST_ICONS[interest];
                    return (
                      <Tile
                        key={interest}
                        label={t(`interests.${interest}`)}
                        icon={meta?.icon}
                        color={meta?.color}
                        selected={interests.includes(interest)}
                        onPress={() => setInterests(toggle(interests, interest))}
                      />
                    );
                  })}
                </View>
              </>
            )}

            {step === 2 && (
              <>
                <ThemedText style={styles.title}>{t('onboarding.difficultyTitle')}</ThemedText>
                <ThemedText style={styles.subtitle}>{t('onboarding.difficultySubtitle')}</ThemedText>
                <View style={styles.options}>
                  {DIFFICULTIES.map((level) => {
                    const selected = difficulty === level;
                    return (
                      <PressableScale
                        key={level}
                        onPress={() => setDifficulty(level)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        style={[styles.option, selected && styles.optionSelected]}>
                        <View style={[styles.levelDot, { backgroundColor: DIFFICULTY_COLORS[level] }]} />
                        <View style={styles.flex}>
                          <ThemedText style={styles.optionTitle}>{t(`difficulty.${level}.name`)}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {t(`difficulty.${level}.blurb`)}
                          </ThemedText>
                        </View>
                        <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? Brand.sea : '#B4C0BA'} />
                      </PressableScale>
                    );
                  })}
                </View>
              </>
            )}

            {step === 3 && (
              <>
                <ThemedText style={styles.title}>{t('onboarding.countriesTitle')}</ThemedText>
                <ThemedText style={styles.subtitle}>{t('onboarding.countriesSubtitle')}</ThemedText>
                <View style={styles.grid}>
                  {COUNTRIES.map((country) => (
                    <Tile
                      key={country}
                      label={t(`countries.${country}`)}
                      country={country}
                      selected={countries.includes(country)}
                      onPress={() => setCountries(toggle(countries, country))}
                    />
                  ))}
                </View>
              </>
            )}

            {step === 4 && (
              <View style={styles.centered}>
                <View style={styles.heroIcon}>
                  <Icon name="location" size={44} color="#FFFFFF" />
                </View>
                <ThemedText style={styles.title}>{t('onboarding.locationTitle')}</ThemedText>
                <ThemedText style={[styles.subtitle, styles.center]}>{t('onboarding.locationBody')}</ThemedText>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {error && <ThemedText style={[styles.center, { color: Brand.danger }]}>{error}</ThemedText>}

        <View style={styles.actions}>
          {step < 4 ? (
            <Button
              label={step === 0 ? t('onboarding.agreeContinue') : t('onboarding.next')}
              disabled={step === 3 && countries.length === 0}
              onPress={next}
            />
          ) : (
            <>
              <Button label={t('onboarding.allowLocation')} icon="navigate" loading={saving} onPress={() => finish(true)} />
              <Button variant="ghost" label={t('onboarding.notNow')} disabled={saving} onPress={() => finish(false)} />
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  back: {
    width: 38,
    height: 38,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  body: {
    flex: 1,
  },
  scroll: {
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Brand.sea,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: 800,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: '#6B7A72',
  },
  center: {
    textAlign: 'center',
  },
  languageBlock: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: '#5E6D65',
    textAlign: 'center',
  },
  link: {
    color: Brand.sea,
    fontWeight: 700,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  tile: {
    width: '30%',
    flexGrow: 1,
    aspectRatio: 1,
    maxWidth: '31.5%',
    borderRadius: Radius.large,
    backgroundColor: '#F2F7F4',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tileSelected: {
    borderColor: Brand.sea,
    backgroundColor: '#E4F1EA',
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: 700,
  },
  tileCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Brand.sea,
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1.5,
    borderColor: '#E6ECE8',
  },
  optionSelected: {
    borderColor: Brand.sea,
    backgroundColor: '#F4FAF6',
  },
  levelDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 800,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  actions: {
    gap: Spacing.two,
  },
});
