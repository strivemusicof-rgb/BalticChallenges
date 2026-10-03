import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Reveal } from '@/components/reveal';
import { Screen, SectionHeader } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Segmented } from '@/components/ui/segmented';
import { Tag } from '@/components/ui/tag';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAchievements, useHistory } from '@/hooks/queries';
import { useCreatePost } from '@/hooks/social-queries';
import { showAlert } from '@/lib/dialog';
import { chooseImage } from '@/lib/images';
import type { Post, Visibility } from '@/lib/types';
import { useCurrentUser } from '@/providers/auth-provider';

const MAX_PHOTOS = 6;

type Kind = Exclude<Post['kind'], 'route'>;

const KINDS: { id: Post['kind']; icon: IconName; title: string; subtitle: string; soon?: boolean }[] = [
  { id: 'adventure', icon: 'image-outline', title: 'Adventure Post', subtitle: 'Share your latest adventure' },
  { id: 'achievement', icon: 'ribbon-outline', title: 'Achievement Post', subtitle: 'Show off your achievement' },
  { id: 'discovery', icon: 'compass-outline', title: 'Discovery Post', subtitle: 'Share a hidden gem' },
  { id: 'route', icon: 'map-outline', title: 'Route Post', subtitle: 'Share your route and stats', soon: true },
];

const VISIBILITY = [
  { id: 'public', label: 'Everyone' },
  { id: 'friends', label: 'Friends' },
  { id: 'private', label: 'Only me' },
] as const;

function KindPicker({ value, onChange, onContinue }: { value: Kind; onChange: (kind: Kind) => void; onContinue: () => void }) {
  return (
    <Screen edges={['bottom']}>
      {KINDS.map((kind, index) => {
        const selected = kind.id === value;
        return (
          <Reveal key={kind.id} index={index}>
            <PressableScale
              disabled={kind.soon}
              onPress={() => onChange(kind.id as Kind)}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: kind.soon }}
              style={[styles.kind, selected && styles.kindSelected, kind.soon && styles.kindSoon]}>
              <View style={styles.kindIcon}>
                <Icon name={kind.icon} size={22} color={Brand.sea} />
              </View>
              <View style={styles.flex}>
                <ThemedText style={styles.kindTitle}>{kind.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {kind.subtitle}
                </ThemedText>
              </View>
              {kind.soon ? (
                <Tag label="Soon" />
              ) : selected ? (
                <Icon name="checkmark-circle" size={24} color={Brand.sea} />
              ) : (
                <Icon name="chevron-forward" size={20} color="#9AA7A0" />
              )}
            </PressableScale>
          </Reveal>
        );
      })}
      <View style={styles.spacer} />
      <Button label="Continue" onPress={onContinue} />
    </Screen>
  );
}

export default function NewPostScreen() {
  const user = useCurrentUser();
  const params = useLocalSearchParams<{
    challengeId?: string;
    challengeTitle?: string;
    achievementId?: string;
    achievementTitle?: string;
    photoUri?: string;
  }>();
  const create = useCreatePost();
  const history = useHistory();
  const achievements = useAchievements();

  const preset: Kind | null = params.achievementId ? 'achievement' : params.challengeId ? 'adventure' : null;
  const [kind, setKind] = useState<Kind>(preset ?? 'adventure');
  const [step, setStep] = useState<'type' | 'compose'>(preset ? 'compose' : 'type');
  const [challengeId, setChallengeId] = useState<string | undefined>(params.challengeId);
  const [achievementId, setAchievementId] = useState<string | undefined>(params.achievementId);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<string[]>(params.photoUri ? [params.photoUri] : []);
  const [showLocation, setShowLocation] = useState(user.showPostLocation);
  const [visibility, setVisibility] = useState<Visibility>('public');

  if (step === 'type') return <KindPicker value={kind} onChange={setKind} onContinue={() => setStep('compose')} />;

  const completed = (history.data ?? [])
    .filter((entry) => entry.status === 'completed')
    .map((entry) => ({ id: entry.challengeId, label: `${entry.icon} ${entry.title}` }));
  // A challenge passed in from the completion screen may not be in the history cache yet.
  if (params.challengeId && params.challengeTitle && !completed.some((entry) => entry.id === params.challengeId)) {
    completed.unshift({ id: params.challengeId, label: `🏆 ${params.challengeTitle}` });
  }
  const unlocked = (achievements.data ?? []).filter((achievement) => achievement.unlockedAt !== null);

  async function addPhoto() {
    const uri = await chooseImage();
    if (uri) setPhotos((current) => [...current, uri].slice(0, MAX_PHOTOS));
  }

  function submit() {
    create.mutate(
      {
        kind,
        body: body.trim(),
        photoUris: photos,
        challengeId: kind === 'adventure' ? challengeId : undefined,
        achievementId: kind === 'achievement' ? achievementId : undefined,
        showLocation,
        visibility,
      },
      {
        onSuccess: ({ post }) => {
          router.back();
          router.push({ pathname: '/post/[id]', params: { id: post.id } });
        },
        onError: (error) => showAlert('Could not post', error.message),
      },
    );
  }

  const canPost =
    kind === 'achievement' ? Boolean(achievementId) : body.trim().length > 0 || photos.length > 0;
  const title = KINDS.find((item) => item.id === kind)?.title ?? 'Create Post';

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title }} />

      {kind === 'adventure' && completed.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Completed challenge" subtitle="Optional — links your post to it" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {completed.map((entry) => (
              <Chip
                key={entry.id}
                compact
                label={entry.label}
                selected={challengeId === entry.id}
                onPress={() => setChallengeId(challengeId === entry.id ? undefined : entry.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {kind === 'achievement' && (
        <View style={styles.section}>
          <SectionHeader title="Which badge?" />
          {unlocked.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              You have not unlocked a badge yet. Complete a challenge to earn your first one.
            </ThemedText>
          ) : (
            <View style={styles.wrap}>
              {unlocked.map((achievement) => (
                <Chip
                  key={achievement.id}
                  compact
                  label={`${achievement.icon} ${achievement.title}`}
                  selected={achievementId === achievement.id}
                  onPress={() => setAchievementId(achievement.id)}
                />
              ))}
            </View>
          )}
        </View>
      )}

      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder={kind === 'discovery' ? 'What did you find? Where is it?' : 'How was it? Tips for other explorers?'}
        placeholderTextColor="#8A9790"
        multiline
        maxLength={2000}
        style={styles.input}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
        {photos.map((uri) => (
          <Pressable key={uri} accessibilityLabel="Remove photo" onPress={() => setPhotos((current) => current.filter((item) => item !== uri))}>
            <Image source={uri} style={styles.photo} contentFit="cover" />
            <View style={styles.remove}>
              <Icon name="close" size={14} color="#FFFFFF" />
            </View>
          </Pressable>
        ))}
        {photos.length < MAX_PHOTOS && (
          <PressableScale onPress={addPhoto} accessibilityLabel="Add photo" style={[styles.photo, styles.addPhoto]}>
            <Icon name="camera-outline" size={26} color={Brand.sea} />
            <ThemedText type="small" style={{ color: Brand.sea }}>
              Add photo
            </ThemedText>
          </PressableScale>
        )}
      </ScrollView>

      <View style={styles.section}>
        <ThemedText type="smallBold">Who can see this?</ThemedText>
        <Segmented options={VISIBILITY} value={visibility} onChange={setVisibility} />
      </View>
      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">Show place name</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Only “Place, City, Country”. Exact coordinates and photo location data are never shared.
          </ThemedText>
        </View>
        <Switch value={showLocation} onValueChange={setShowLocation} trackColor={{ true: Brand.sea }} accessibilityLabel="Show place name" />
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Be kind, don’t show people without their consent, and don’t share your home location.
      </ThemedText>
      <Button label="Post" icon="paper-plane-outline" disabled={!canPost} loading={create.isPending} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: 2,
  },
  spacer: {
    height: Spacing.four,
  },
  kind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1.5,
    borderColor: '#E6ECE8',
    backgroundColor: '#FFFFFF',
  },
  kindSelected: {
    borderColor: Brand.sea,
    backgroundColor: '#F4FAF6',
  },
  kindSoon: {
    opacity: 0.55,
  },
  kindIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    backgroundColor: Brand.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindTitle: {
    fontSize: 16,
    fontWeight: 800,
  },
  section: {
    gap: Spacing.two,
  },
  chips: {
    gap: Spacing.two,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  input: {
    minHeight: 130,
    borderRadius: Radius.large,
    backgroundColor: '#F5F8F6',
    padding: Spacing.three,
    fontSize: 16,
    color: '#15211B',
    textAlignVertical: 'top',
  },
  photos: {
    gap: Spacing.two,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: Radius.medium,
  },
  addPhoto: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#B9D3C5',
    backgroundColor: '#F5FAF7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
