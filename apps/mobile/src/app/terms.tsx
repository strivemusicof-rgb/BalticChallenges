import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Glyph } from '@/components/ui/glyph';
import { Brand, Spacing } from '@/constants/theme';
import { useUpdateProfile } from '@/hooks/queries';
import { showAlert } from '@/lib/dialog';
import { useT } from '@/lib/i18n';
import { openLegal, TERMS_VERSION } from '@/lib/legal';
import { useAuth } from '@/providers/auth-provider';

/** Shown to signed-in players whenever the terms version changes. */
export default function TermsScreen() {
  const t = useT();
  const { signOut } = useAuth();
  const update = useUpdateProfile();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <Glyph name="file-document-outline" size={40} color="#FFFFFF" />
        </View>
        <ThemedText style={styles.title}>{t('terms.title')}</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {t('terms.body')}
        </ThemedText>
        <Button variant="ghost" label={t('terms.readTerms')} onPress={() => openLegal('terms')} />
        <Button variant="ghost" label={t('terms.readPrivacy')} onPress={() => openLegal('privacy')} />
      </View>
      <View style={styles.actions}>
        <Button
          label={t('terms.agree')}
          loading={update.isPending}
          onPress={() =>
            update.mutate({ acceptTerms: TERMS_VERSION }, { onError: (error) => showAlert(t('common.couldNotSave'), error.message) })
          }
        />
        <Button variant="ghost" label={t('settings.signOut')} onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    padding: Spacing.four,
    backgroundColor: '#FFFFFF',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  icon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Brand.sea,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.two,
  },
});
