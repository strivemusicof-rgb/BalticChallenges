import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Screen, SectionHeader } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Segmented } from '@/components/ui/segmented';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useUpdateProfile, useUploadAvatar, type ProfilePatch } from '@/hooks/queries';
import { api } from '@/lib/api';
import { showAlert } from '@/lib/dialog';
import { COUNTRIES, DIFFICULTIES, INTEREST_IDS } from '@/lib/format';
import { currentLanguage, LANGUAGES, setLanguage, useT, type Language } from '@/lib/i18n';
import { chooseImage } from '@/lib/images';
import { openLegal } from '@/lib/legal';
import type { Visibility } from '@/lib/types';
import { useAuth, useCurrentUser } from '@/providers/auth-provider';

const VISIBILITY: { id: Visibility; label: string; blurb: string; icon: IconName }[] = [
  { id: 'public', label: 'settings.public', blurb: 'settings.publicBlurb', icon: 'globe-outline' },
  { id: 'friends', label: 'settings.friendsOnly', blurb: 'settings.friendsBlurb', icon: 'people-outline' },
  { id: 'private', label: 'settings.private', blurb: 'settings.privateBlurb', icon: 'lock-closed-outline' },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function Group({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function SwitchRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        {hint && (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        )}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: Brand.sea }} accessibilityLabel={label} />
    </View>
  );
}

function LinkRow({ icon, label, onPress, danger = false }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.99} style={styles.row}>
      <Icon name={icon} size={19} color={danger ? Brand.danger : Brand.sea} />
      <ThemedText style={[styles.rowLabel, styles.flex, danger && { color: Brand.danger }]}>{label}</ThemedText>
      <Icon name="chevron-forward" size={18} color="#9AA7A0" />
    </PressableScale>
  );
}

export default function SettingsScreen() {
  const t = useT();
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const update = useUpdateProfile();
  const avatar = useUploadAvatar();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [language, setLanguageState] = useState<Language>(currentLanguage());

  const save = (patch: ProfilePatch) =>
    update.mutate(patch, {
      onError: (error) => showAlert(t('common.couldNotSave'), error.message),
    });

  const profileDirty = displayName.trim() !== user.displayName || bio.trim() !== user.bio;

  async function changeAvatar() {
    const uri = await chooseImage({ square: true, maxEdge: 1024 });
    if (uri) avatar.mutate(uri, { onError: (error) => showAlert(t('settings.uploadFailed'), error.message) });
  }

  function confirmDelete() {
    showAlert(t('settings.deleteTitle'), t('settings.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api('/v1/me', { method: 'DELETE' });
            await signOut();
          } catch (error) {
            showAlert(t('settings.deleteFailed'), error instanceof Error ? error.message : t('settings.tryLater'));
          }
        },
      },
    ]);
  }

  return (
    <Screen edges={['bottom']}>
      <View style={styles.avatarBlock}>
        <Pressable onPress={changeAvatar} accessibilityRole="button" accessibilityLabel={t('settings.changePhoto')}>
          <Avatar name={user.displayName} url={user.avatarUrl} size={92} />
          <View style={styles.cameraBadge}>
            <Icon name="camera" size={14} color="#FFFFFF" />
          </View>
        </Pressable>
        <Button
          variant="ghost"
          size="small"
          label={avatar.isPending ? t('settings.uploading') : t('settings.changePhoto')}
          loading={avatar.isPending}
          onPress={changeAvatar}
        />
      </View>

      <SectionHeader title={t('settings.language')} />
      <Segmented
        options={LANGUAGES.map((item) => ({ id: item.code, label: item.label }))}
        value={language}
        onChange={(next) => {
          setLanguageState(next);
          void setLanguage(next);
        }}
      />

      <SectionHeader title={t('settings.profile')} />
      <View style={styles.form}>
        <ThemedText style={styles.fieldLabel}>{t('settings.displayName')}</ThemedText>
        <TextInput value={displayName} onChangeText={setDisplayName} maxLength={40} style={styles.input} />
        <ThemedText style={styles.fieldLabel}>{t('settings.bio')}</ThemedText>
        <TextInput
          value={bio}
          onChangeText={setBio}
          maxLength={300}
          multiline
          placeholder={t('settings.bioPlaceholder')}
          placeholderTextColor="#8A9790"
          style={[styles.input, styles.multiline]}
        />
        <Button
          label={t('settings.saveProfile')}
          disabled={!profileDirty || displayName.trim().length === 0}
          loading={update.isPending}
          onPress={() => save({ displayName: displayName.trim(), bio: bio.trim() })}
        />
      </View>

      <SectionHeader title={t('settings.interests')} />
      <View style={styles.chips}>
        {INTEREST_IDS.map((interest) => (
          <Chip
            key={interest}
            compact
            label={t(`interests.${interest}`)}
            selected={user.interests.includes(interest)}
            onPress={() => save({ interests: toggle(user.interests, interest) })}
          />
        ))}
      </View>

      <SectionHeader title={t('settings.difficulty')} />
      <View style={styles.chips}>
        {DIFFICULTIES.map((level) => (
          <Chip
            key={level}
            compact
            label={t(`difficulty.${level}.name`)}
            selected={user.difficulty === level}
            onPress={() => save({ difficulty: level })}
          />
        ))}
      </View>

      <SectionHeader title={t('settings.countries')} />
      <View style={styles.chips}>
        {COUNTRIES.map((country) => (
          <Chip
            key={country}
            compact
            label={t(`countries.${country}`)}
            selected={user.countries.includes(country)}
            onPress={() => {
              const next = toggle(user.countries, country);
              if (next.length > 0) save({ countries: next });
            }}
          />
        ))}
      </View>

      <SectionHeader title={t('settings.privacy')} />
      <Group>
        {VISIBILITY.map((option) => {
          const selected = user.profileVisibility === option.id;
          return (
            <PressableScale
              key={option.id}
              scaleTo={0.99}
              onPress={() => save({ profileVisibility: option.id })}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={styles.row}>
              <Icon name={option.icon} size={19} color={Brand.sea} />
              <View style={styles.flex}>
                <ThemedText style={styles.rowLabel}>{t(option.label)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t(option.blurb)}
                </ThemedText>
              </View>
              <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? Brand.sea : '#B4C0BA'} />
            </PressableScale>
          );
        })}
        <SwitchRow
          label={t('settings.showPlace')}
          hint={t('settings.showPlaceHint')}
          value={user.showPostLocation}
          onChange={(value) => save({ showPostLocation: value })}
        />
        <LinkRow icon="ban-outline" label={t('settings.blocked')} onPress={() => router.push('/blocked')} />
      </Group>

      <SectionHeader title={t('settings.notifications')} />
      <Group>
        <SwitchRow
          label={t('settings.progress')}
          hint={t('settings.progressHint')}
          value={user.notifications.progress}
          onChange={(value) => save({ notifications: { progress: value } })}
        />
        <SwitchRow
          label={t('settings.social')}
          hint={t('settings.socialHint')}
          value={user.notifications.social}
          onChange={(value) => save({ notifications: { social: value } })}
        />
        <SwitchRow
          label={t('settings.newChallenges')}
          hint={t('settings.newChallengesHint')}
          value={user.notifications.newChallenges}
          onChange={(value) => save({ notifications: { newChallenges: value } })}
        />
      </Group>

      <SectionHeader title={t('settings.about')} />
      <Group>
        <LinkRow icon="bookmark-outline" label={t('settings.saved')} onPress={() => router.push('/saved')} />
        <LinkRow icon="time-outline" label={t('settings.history')} onPress={() => router.push('/history')} />
        <LinkRow icon="document-text-outline" label={t('settings.terms')} onPress={() => openLegal('terms')} />
        <LinkRow icon="shield-outline" label={t('settings.privacyPolicy')} onPress={() => openLegal('privacy')} />
        <LinkRow icon="help-circle-outline" label={t('settings.support')} onPress={() => openLegal('support')} />
      </Group>

      <SectionHeader title={t('settings.account')} />
      <ThemedText type="small" themeColor="textSecondary">
        {t('settings.signedInAs', { email: user.email ?? t('settings.socialAccount') })}
      </ThemedText>
      <Group>
        <LinkRow icon="log-out-outline" label={t('settings.signOut')} onPress={signOut} />
        <LinkRow icon="trash-outline" label={t('settings.deleteAccount')} onPress={confirmDelete} danger />
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarBlock: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Brand.sea,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: Spacing.two,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: '#5E6D65',
  },
  input: {
    borderRadius: Radius.medium,
    backgroundColor: '#F2F5F3',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 2,
    fontSize: 16,
    color: '#15211B',
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  group: {
    borderRadius: Radius.large,
    backgroundColor: '#F7F9F8',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E6ECE8',
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: 600,
  },
  flex: {
    flex: 1,
  },
});
