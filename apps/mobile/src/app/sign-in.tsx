import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { BRAND_IMAGES } from '@/lib/brand-images';
import { currentLanguage, i18n, LANGUAGES, setLanguage, useT } from '@/lib/i18n';
import { useAuth } from '@/providers/auth-provider';

type Mode = 'register' | 'login';

function Field({
  icon,
  ...props
}: { icon: IconName } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Icon name={icon} size={18} color="#7C8A83" />
      <TextInput placeholderTextColor="#8A9790" style={styles.input} {...props} />
    </View>
  );
}

export default function SignInScreen() {
  const t = useT();
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<Mode>('register');
  const [showForm, setShowForm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.includes('@') && password.length >= (mode === 'register' ? 8 : 1) && (mode === 'login' || displayName.trim());

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'register') await register(email.trim(), password, displayName.trim());
      else await signIn(email.trim(), password);
    } catch (caught) {
      const details = caught instanceof ApiError && Array.isArray(caught.details) ? caught.details : null;
      setError(details?.[0]?.message ?? (caught instanceof Error ? caught.message : i18n.t('common.somethingWrong')));
    } finally {
      setSubmitting(false);
    }
  }

  const open = (next: Mode) => {
    setError(null);
    setMode(next);
    setShowForm(true);
  };

  if (!showForm) {
    return (
      <View style={styles.splash}>
        <Image source={BRAND_IMAGES.welcome.uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
        <LinearGradient
          colors={['rgba(6,18,30,0.55)', 'rgba(6,18,30,0.05)', 'rgba(6,18,30,0.15)', 'rgba(6,18,30,0.9)']}
          locations={[0, 0.3, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.splashContent}>
          <View style={styles.languages}>
            {LANGUAGES.map((item) => (
              <Pressable
                key={item.code}
                onPress={() => void setLanguage(item.code)}
                accessibilityRole="button"
                accessibilityState={{ selected: currentLanguage() === item.code }}
                style={[styles.languagePill, currentLanguage() === item.code && styles.languagePillActive]}>
                <ThemedText style={styles.languageText}>{item.code.toUpperCase()}</ThemedText>
              </Pressable>
            ))}
          </View>
          <Animated.View entering={FadeIn.duration(600)} style={styles.brand}>
            <LogoMark size={92} />
            <ThemedText style={styles.brandTop}>{t('auth.brandTop')}</ThemedText>
            <ThemedText style={styles.brandBottom}>{t('auth.brandBottom')}</ThemedText>
            <ThemedText style={styles.tagline}>{t('auth.tagline')}</ThemedText>
            <ThemedText style={styles.countries}>{t('auth.countriesLine')}</ThemedText>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(350).duration(500)} style={styles.splashBottom}>
            <Button label={t('auth.getStarted')} variant="light" onPress={() => open('register')} style={styles.pill} />
            <Button variant="ghost" label={t('auth.haveAccount')} textColor="#FFFFFF" onPress={() => open('login')} />
            <ThemedText style={styles.credit}>{t('common.photoCredit', { credit: `${BRAND_IMAGES.welcome.credit} · Wikimedia Commons` })}</ThemedText>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <IconButton icon="chevron-back" label={t('common.back')} onPress={() => setShowForm(false)} background="#F0F4F1" />
          <Animated.View key={mode} entering={FadeInDown.duration(350)} style={styles.formHeader}>
            <View style={styles.formLogo}>
              <LogoMark size={44} />
            </View>
            <ThemedText style={styles.formTitle}>{mode === 'register' ? t('auth.createAccount') : t('auth.welcomeBack')}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {mode === 'register' ? t('auth.registerSubtitle') : t('auth.loginSubtitle')}
            </ThemedText>
          </Animated.View>

          <View style={styles.form}>
            {mode === 'register' && (
              <Field
                icon="person-outline"
                placeholder={t('auth.name')}
                autoComplete="name"
                textContentType="name"
                maxLength={40}
                value={displayName}
                onChangeText={setDisplayName}
              />
            )}
            <Field
              icon="mail-outline"
              placeholder={t('auth.email')}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            <Field
              icon="lock-closed-outline"
              placeholder={mode === 'register' ? t('auth.passwordNew') : t('auth.password')}
              secureTextEntry
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              textContentType={mode === 'register' ? 'newPassword' : 'password'}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={() => canSubmit && void submit()}
            />
            {error && (
              <View style={styles.error}>
                <Icon name="alert-circle" size={16} color={Brand.danger} />
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              </View>
            )}
            <Button
              label={mode === 'register' ? t('auth.startExploring') : t('auth.signIn')}
              loading={submitting}
              disabled={!canSubmit}
              onPress={submit}
            />
            <Button
              variant="ghost"
              label={mode === 'register' ? t('auth.haveAccount') : t('auth.createNew')}
              onPress={() => open(mode === 'register' ? 'login' : 'register')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  splash: {
    flex: 1,
    backgroundColor: '#0E2233',
  },
  splashContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  languages: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    paddingTop: Spacing.two,
  },
  languagePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  languagePillActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  languageText: {
    fontSize: 12,
    fontWeight: 800,
    color: '#0E2233',
  },
  brand: {
    alignItems: 'center',
    marginTop: Spacing.six,
  },
  brandTop: {
    color: '#FFFFFF',
    fontSize: 44,
    lineHeight: 50,
    fontWeight: 800,
    letterSpacing: 5,
    marginTop: Spacing.three,
  },
  brandBottom: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: 700,
    letterSpacing: 4,
  },
  tagline: {
    color: '#F6D7A7',
    fontSize: 17,
    fontWeight: 700,
    marginTop: Spacing.three,
  },
  countries: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
  },
  splashBottom: {
    gap: Spacing.two,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  pill: {
    borderRadius: Radius.pill,
  },
  credit: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    textAlign: 'center',
  },
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  formContainer: {
    padding: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.four,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  formHeader: {
    gap: Spacing.two,
  },
  formLogo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Brand.sea,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  formTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 800,
  },
  form: {
    gap: Spacing.three,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    minHeight: 54,
    borderRadius: Radius.medium,
    backgroundColor: '#F2F5F3',
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#15211B',
    paddingVertical: Spacing.two,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#FDECEC',
    borderRadius: Radius.small,
    padding: Spacing.two + 2,
  },
  errorText: {
    flex: 1,
    color: Brand.danger,
  },
});
