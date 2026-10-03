import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useUpdateProfile } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { openLegal, TERMS_VERSION } from '@/lib/legal';
import { useAuth } from '@/providers/auth-provider';
import { showAlert } from '@/lib/dialog';

/** Shown to signed-in players whenever the terms version changes. */
export default function TermsScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const update = useUpdateProfile();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.body}>
        <ThemedText style={styles.emoji}>📜</ThemedText>
        <ThemedText type="subtitle" style={styles.center}>
          We updated our terms
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          Please review the Terms of Use and Privacy Policy to keep exploring.
        </ThemedText>
        <Button variant="ghost" label="Read Terms of Use" onPress={() => openLegal('terms')} />
        <Button variant="ghost" label="Read Privacy Policy" onPress={() => openLegal('privacy')} />
      </View>
      <View style={styles.actions}>
        <Button
          label="I agree"
          loading={update.isPending}
          onPress={() =>
            update.mutate({ acceptTerms: TERMS_VERSION }, { onError: (error) => showAlert('Could not save', error.message) })
          }
        />
        <Button variant="ghost" label="Sign out" onPress={signOut} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    padding: Spacing.four,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  emoji: {
    fontSize: 56,
    lineHeight: 66,
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.two,
  },
});
