import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Reveal } from '@/components/reveal';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { showAlert } from '@/lib/dialog';
import { useT } from '@/lib/i18n';
import { openLegal } from '@/lib/legal';

type Plan = 'monthly' | 'yearly';
const PLANS = [
  { id: 'monthly', label: 'pro.monthly' },
  { id: 'yearly', label: 'pro.yearly' },
] as const;

const PRICE: Record<Plan, { amount: string; period: string; note: string }> = {
  monthly: { amount: '€4.99', period: 'pro.perMonth', note: 'pro.noteMonthly' },
  yearly: { amount: '€39.99', period: 'pro.perYear', note: 'pro.noteYearly' },
};

const FEATURES = ['offline', 'stats', 'routes', 'exclusive', 'badge', 'ads'] as const;

export default function ProScreen() {
  const t = useT();
  const [plan, setPlan] = useState<Plan>('monthly');
  const price = PRICE[plan];

  return (
    <Screen edges={['bottom']}>
      <Reveal style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name="diamond" size={30} color="#FFFFFF" />
        </View>
        <ThemedText style={styles.subtitle}>{t('pro.subtitle')}</ThemedText>
      </Reveal>

      <Reveal index={1}>
        <Segmented options={PLANS.map((item) => ({ ...item, label: t(item.label) }))} value={plan} onChange={setPlan} />
      </Reveal>

      <Reveal index={2} style={styles.priceBox}>
        <View style={styles.priceRow}>
          <ThemedText style={styles.price}>{price.amount}</ThemedText>
          <ThemedText style={styles.period}>{t(price.period)}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {t(price.note)}
        </ThemedText>
        <Button
          label={t('pro.goPro')}
          onPress={() =>
            showAlert(t('pro.comingTitle'), t('pro.comingBody'))
          }
        />
      </Reveal>

      <Reveal index={3} style={styles.features}>
        {FEATURES.map((feature) => (
          <View key={feature} style={styles.feature}>
            <View style={styles.check}>
              <Icon name="checkmark" size={14} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.featureText}>{t(`pro.features.${feature}`)}</ThemedText>
          </View>
        ))}
      </Reveal>

      <ThemedText type="small" themeColor="textSecondary" style={styles.legal}>
        {t('pro.legal')}{' '}
        <ThemedText type="small" style={styles.link} onPress={() => openLegal('terms')}>
          {t('pro.terms')}
        </ThemedText>{' '}
        ·{' '}
        <ThemedText type="small" style={styles.link} onPress={() => openLegal('privacy')}>
          {t('pro.privacy')}
        </ThemedText>
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.sea,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#5E6D65',
    fontWeight: 600,
  },
  priceBox: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
    backgroundColor: '#F5F8F6',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  price: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: 800,
  },
  period: {
    fontSize: 16,
    color: '#6B7A72',
    marginBottom: 6,
  },
  features: {
    gap: Spacing.three,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Brand.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    fontWeight: 600,
  },
  legal: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  link: {
    color: Brand.sea,
    fontWeight: 700,
  },
});
