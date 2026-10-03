import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Screen, SectionHeader } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Radius, Spacing } from '@/constants/theme';
import { useUpdateProfile, useUploadAvatar, type ProfilePatch } from '@/hooks/queries';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { COUNTRY_LABELS, DIFFICULTY_LABELS, INTEREST_OPTIONS } from '@/lib/format';
import { chooseImage } from '@/lib/images';
import { openLegal } from '@/lib/legal';
import type { Country, Difficulty, Visibility } from '@/lib/types';
import { useAuth, useCurrentUser } from '@/providers/auth-provider';
import { showAlert } from '@/lib/dialog';

const VISIBILITY: { id: Visibility; label: string; blurb: string }[] = [
  { id: 'public', label: '🌍 Public', blurb: 'Anyone can see your profile, badges and posts' },
  { id: 'friends', label: '👥 Friends', blurb: 'Only people you follow back' },
  { id: 'private', label: '🔒 Private', blurb: 'Only you; you are hidden from leaderboards' },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function SwitchRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {hint && (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        )}
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

function LinkRow({ label, onPress, danger = false }: { label: string; onPress: () => void; danger?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.6 }]}>
      <ThemedText type="smallBold" style={danger ? styles.danger : undefined}>
        {label}
      </ThemedText>
      <ThemedText style={{ color: theme.textSecondary }}>›</ThemedText>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const update = useUpdateProfile();
  const avatar = useUploadAvatar();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);

  const save = (patch: ProfilePatch) =>
    update.mutate(patch, {
      onError: (error) => showAlert('Could not save', error.message),
    });

  const profileDirty = displayName.trim() !== user.displayName || bio.trim() !== user.bio;

  async function changeAvatar() {
    const uri = await chooseImage({ square: true, maxEdge: 1024 });
    if (uri) avatar.mutate(uri, { onError: (error) => showAlert('Upload failed', error.message) });
  }

  function confirmDelete() {
    showAlert(
      'Delete account?',
      'This permanently deletes your profile, posts, photos, XP, badges and challenge history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api('/v1/me', { method: 'DELETE' });
              await signOut();
            } catch (error) {
              showAlert('Could not delete account', error instanceof Error ? error.message : 'Try again later');
            }
          },
        },
      ],
    );
  }

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }];

  return (
    <Screen edges={[]}>
      <View style={styles.avatarBlock}>
        <Pressable onPress={changeAvatar} accessibilityRole="button" accessibilityLabel="Change profile photo">
          <Avatar name={user.displayName} url={user.avatarUrl} size={96} />
        </Pressable>
        <Button variant="ghost" label={avatar.isPending ? 'Uploading…' : 'Change photo'} loading={avatar.isPending} onPress={changeAvatar} />
      </View>

      <SectionHeader title="Profile" />
      <Card>
        <ThemedText type="smallBold">Display name</ThemedText>
        <TextInput value={displayName} onChangeText={setDisplayName} maxLength={40} style={inputStyle} />
        <ThemedText type="smallBold">Bio</ThemedText>
        <TextInput
          value={bio}
          onChangeText={setBio}
          maxLength={300}
          multiline
          placeholder="Castle hunter from Cēsis 🏰"
          placeholderTextColor={theme.textSecondary}
          style={[inputStyle, styles.multiline]}
        />
        <Button
          label="Save profile"
          disabled={!profileDirty || displayName.trim().length === 0}
          loading={update.isPending}
          onPress={() => save({ displayName: displayName.trim(), bio: bio.trim() })}
        />
      </Card>

      <SectionHeader title="Interests" />
      <View style={styles.chips}>
        {INTEREST_OPTIONS.map((interest) => (
          <Chip
            key={interest.id}
            label={interest.label}
            selected={user.interests.includes(interest.id)}
            onPress={() => save({ interests: toggle(user.interests, interest.id) })}
          />
        ))}
      </View>

      <SectionHeader title="Difficulty" />
      <View style={styles.chips}>
        {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((level) => (
          <Chip
            key={level}
            label={`${DIFFICULTY_LABELS[level].dot} ${DIFFICULTY_LABELS[level].name}`}
            selected={user.difficulty === level}
            onPress={() => save({ difficulty: level })}
          />
        ))}
      </View>

      <SectionHeader title="Countries" />
      <View style={styles.chips}>
        {(Object.keys(COUNTRY_LABELS) as Country[]).map((country) => (
          <Chip
            key={country}
            label={`${COUNTRY_LABELS[country].flag} ${COUNTRY_LABELS[country].name}`}
            selected={user.countries.includes(country)}
            onPress={() => {
              const next = toggle(user.countries, country);
              if (next.length > 0) save({ countries: next });
            }}
          />
        ))}
      </View>

      <SectionHeader title="Privacy" />
      <Card>
        {VISIBILITY.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => save({ profileVisibility: option.id })}
            accessibilityRole="radio"
            accessibilityState={{ checked: user.profileVisibility === option.id }}
            style={styles.radioRow}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">{option.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {option.blurb}
              </ThemedText>
            </View>
            <ThemedText style={{ color: theme.tint }}>{user.profileVisibility === option.id ? '●' : '○'}</ThemedText>
          </Pressable>
        ))}
        <SwitchRow
          label="Show place on my posts"
          hint="Only the place name is shown, never your coordinates"
          value={user.showPostLocation}
          onChange={(value) => save({ showPostLocation: value })}
        />
        <LinkRow label="Blocked people" onPress={() => router.push('/blocked')} />
      </Card>

      <SectionHeader title="Notifications" />
      <Card>
        <SwitchRow
          label="Progress"
          hint="Streak reminders, goals and rewards"
          value={user.notifications.progress}
          onChange={(value) => save({ notifications: { progress: value } })}
        />
        <SwitchRow
          label="Friends"
          hint="New followers and comments"
          value={user.notifications.social}
          onChange={(value) => save({ notifications: { social: value } })}
        />
        <SwitchRow
          label="New challenges"
          hint="New and seasonal challenges near you"
          value={user.notifications.newChallenges}
          onChange={(value) => save({ notifications: { newChallenges: value } })}
        />
      </Card>

      <SectionHeader title="About" />
      <Card>
        <LinkRow label="Saved posts" onPress={() => router.push('/saved')} />
        <LinkRow label="Challenge history" onPress={() => router.push('/history')} />
        <LinkRow label="Terms of Use" onPress={() => openLegal('terms')} />
        <LinkRow label="Privacy Policy" onPress={() => openLegal('privacy')} />
        <LinkRow label="Help & support" onPress={() => openLegal('support')} />
      </Card>

      <SectionHeader title="Account" />
      <ThemedText type="small" themeColor="textSecondary">
        Signed in as {user.email ?? 'social account'}
      </ThemedText>
      <Button variant="secondary" label="Sign out" onPress={signOut} />
      <Button variant="ghost" label="Delete account" onPress={confirmDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarBlock: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  danger: {
    color: '#D64545',
  },
});
