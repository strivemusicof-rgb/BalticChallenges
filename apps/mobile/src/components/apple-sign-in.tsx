import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { Radius } from '@/constants/theme';
import { showAlert } from '@/lib/dialog';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/providers/auth-provider';

/** Native "Sign in with Apple" button. Renders nothing where Apple sign-in is unavailable (web, Android). */
export function AppleSignInButton({ variant = 'white' }: { variant?: 'white' | 'black' }) {
  const t = useT();
  const { signInWithApple } = useAuth();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);

  if (!available) return null;

  async function signIn() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) throw new Error(t('common.somethingWrong'));
      // Apple only shares the name on the first authorization, so pass it along when we get it.
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ') || undefined;
      await signInWithApple(credential.identityToken, fullName);
    } catch (error) {
      if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      showAlert(t('common.somethingWrong'), error instanceof Error ? error.message : undefined);
    }
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={
        variant === 'white'
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={Radius.medium}
      style={styles.button}
      onPress={signIn}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    width: '100%',
  },
});
