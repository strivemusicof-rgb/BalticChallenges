import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { LogoMark } from '@/components/logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { HexBadge } from '@/components/ui/hex-badge';
import { Brand } from '@/constants/theme';
import { showAlert } from '@/lib/dialog';
import type { GlyphName } from '@/lib/glyphs';
import { useT } from '@/lib/i18n';

export interface ShareCardContent {
  kicker: string;
  title: string;
  xp?: number;
  photo?: string | null;
  glyph: GlyphName;
  name: string;
  level: number;
}

const WIDTH = 360;
const HEIGHT = 450;

/** The 4:5 card that gets turned into an image (fits Instagram posts and stories). */
function Card({ content, t }: { content: ShareCardContent; t: ReturnType<typeof useT> }) {
  return (
    <View style={styles.card}>
      {content.photo ? (
        <Image source={content.photo} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient colors={[Brand.seaDeep, Brand.sea]} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient colors={['rgba(8,24,17,0.25)', 'rgba(8,24,17,0.9)']} locations={[0.2, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.top}>
        <LogoMark size={34} />
        <ThemedText style={styles.brand}>BALTIC CHALLENGES</ThemedText>
      </View>
      <View style={styles.bottom}>
        <HexBadge glyph={content.glyph} size={72} />
        <ThemedText style={styles.kicker}>{content.kicker}</ThemedText>
        <ThemedText style={styles.title} numberOfLines={3}>
          {content.title}
        </ThemedText>
        {content.xp ? <ThemedText style={styles.xp}>{t('common.xp', { xp: content.xp })}</ThemedText> : null}
        <ThemedText style={styles.name}>
          {content.name} · {t('common.level', { level: content.level })}
        </ThemedText>
      </View>
    </View>
  );
}

/** Button that renders the card off-screen, captures it as an image and opens the system share sheet. */
export function ShareCardButton({
  content,
  label,
  variant = 'outline',
}: {
  content: ShareCardContent;
  label?: string;
  variant?: 'primary' | 'outline' | 'secondary';
}) {
  const t = useT();
  const ref = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      if (Platform.OS === 'web') {
        // Browsers cannot reliably snapshot native views; share the text instead.
        const text = `${content.kicker}: ${content.title} — Baltic Challenges`;
        if (navigator.share) await navigator.share({ title: 'Baltic Challenges', text });
        else showAlert(t('share.notAvailable'), text);
        return;
      }
      const uri = await captureRef(ref, { format: 'png', quality: 1, width: 1080, height: 1350 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: content.title, UTI: 'public.png' });
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return;
      showAlert(t('common.somethingWrong'), error instanceof Error ? error.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <View style={styles.offscreen} pointerEvents="none">
        <View ref={ref} collapsable={false}>
          <Card content={content} t={t} />
        </View>
      </View>
      <Button label={label ?? t('share.card')} icon="share-social-outline" variant={variant} loading={busy} onPress={() => void share()} />
    </>
  );
}

/**
 * One off-screen card for a whole screen: call `share(content)` from any row.
 * Render `host` once somewhere in the screen.
 */
export function useShareCard() {
  const t = useT();
  const ref = useRef<View>(null);
  const [content, setContent] = useState<ShareCardContent | null>(null);

  async function share(next: ShareCardContent) {
    try {
      if (Platform.OS === 'web') {
        const text = `${next.kicker}: ${next.title} — Baltic Challenges`;
        if (navigator.share) await navigator.share({ title: 'Baltic Challenges', text });
        else showAlert(t('share.notAvailable'), text);
        return;
      }
      setContent(next);
      // Wait two frames so the card has rendered with the new content (and its image has a chance to load).
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise((resolve) => setTimeout(resolve, 250));
      const uri = await captureRef(ref, { format: 'png', quality: 1, width: 1080, height: 1350 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: next.title, UTI: 'public.png' });
    } catch (error) {
      if ((error as { name?: string }).name === 'AbortError') return;
      showAlert(t('common.somethingWrong'), error instanceof Error ? error.message : undefined);
    }
  }

  const host = content ? (
    <View style={styles.offscreen} pointerEvents="none">
      <View ref={ref} collapsable={false}>
        <Card content={content} t={t} />
      </View>
    </View>
  ) : null;

  return { host, share };
}

/** Small helper so screens can wrap optional share content. */
export function ShareRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -10_000,
    top: 0,
    opacity: 1,
  },
  card: {
    width: WIDTH,
    height: HEIGHT,
    overflow: 'hidden',
    backgroundColor: Brand.seaDeep,
    justifyContent: 'space-between',
    padding: 24,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    color: '#FFFFFF',
    fontWeight: 800,
    letterSpacing: 2,
    fontSize: 13,
  },
  bottom: {
    gap: 6,
  },
  kicker: {
    color: '#F6D7A7',
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 33,
    fontWeight: 800,
  },
  xp: {
    color: '#F7C863',
    fontSize: 20,
    fontWeight: 800,
  },
  name: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: 600,
    marginTop: 6,
  },
  row: {
    gap: 12,
  },
});
