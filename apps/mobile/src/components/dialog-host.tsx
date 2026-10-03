import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Brand, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { dismissAlert, useDialog, type DialogButton } from '@/lib/dialog';

/** Renders the app-wide bottom-sheet dialog requested through `showAlert`. Mount once at the root. */
export function DialogHost() {
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  if (!dialog) return null;

  const cancel = dialog.buttons.find((button) => button.style === 'cancel');
  const actions = dialog.buttons.filter((button) => button !== cancel);

  const row = (button: DialogButton, index: number) => (
    <PressableScale
      key={`${button.text}-${index}`}
      scaleTo={0.98}
      onPress={() => dismissAlert(button)}
      style={[styles.action, index > 0 && styles.divider]}>
      <Text style={[styles.actionText, button.style === 'destructive' && styles.destructive]}>{button.text}</Text>
    </PressableScale>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={() => dismissAlert(cancel)} />
      </Animated.View>
      <Animated.View
        key={dialog.id}
        entering={SlideInDown.springify().damping(20).stiffness(220)}
        exiting={SlideOutDown.duration(180)}
        style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}
        accessibilityViewIsModal>
        <View style={styles.handle} />
        <Text style={styles.title}>{dialog.title}</Text>
        {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
        <ScrollView style={styles.actions} bounces={false}>
          {actions.map(row)}
        </ScrollView>
        {cancel && (
          <PressableScale scaleTo={0.98} onPress={() => dismissAlert(cancel)} style={styles.cancel}>
            <Text style={styles.cancelText}>{cancel.text}</Text>
          </PressableScale>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(10,25,18,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.three + 4,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DCE4DF',
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    color: '#15211B',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7A72',
    textAlign: 'center',
  },
  actions: {
    maxHeight: 420,
    marginTop: Spacing.two,
    borderRadius: Radius.medium,
    backgroundColor: '#F5F8F6',
  },
  action: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DCE4DF',
  },
  actionText: {
    fontSize: 16,
    fontWeight: 600,
    color: Brand.sea,
  },
  destructive: {
    color: Brand.danger,
  },
  cancel: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: Radius.medium,
    backgroundColor: '#F0F4F1',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: 700,
    color: '#15211B',
  },
});
