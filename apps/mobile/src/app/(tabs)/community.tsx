import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PostList } from '@/components/post-list';
import { PageTitle } from '@/components/screen';
import { IconButton } from '@/components/ui/icon-button';
import { Segmented } from '@/components/ui/segmented';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useFeed } from '@/hooks/social-queries';

type Scope = 'following' | 'friends' | 'global';
const SCOPES = [
  { id: 'following', label: 'Following' },
  { id: 'friends', label: 'Friends' },
  { id: 'global', label: 'Global' },
] as const;

const EMPTY = {
  following: { emoji: '👥', title: 'Nothing from people you follow yet', body: 'Find explorers to follow, or check Global.' },
  friends: { emoji: '🤝', title: 'No posts from friends yet', body: 'Friends are people who follow you back.' },
  global: { emoji: '🧭', title: 'No adventures shared yet', body: 'Complete a challenge and be the first to share it!' },
};

export default function CommunityScreen() {
  const [scope, setScope] = useState<Scope>('following');
  const feed = useFeed(scope);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <PageTitle
          title="Community"
          right={
            <View style={styles.actions}>
              <IconButton icon="trophy-outline" label="Leaderboard" onPress={() => router.push('/leaderboard')} background="#F0F4F1" />
              <IconButton icon="person-add-outline" label="Find people" onPress={() => router.push('/people')} background="#F0F4F1" />
              <IconButton icon="add" label="Create post" onPress={() => router.push('/new-post')} background={Brand.sea} color="#FFFFFF" />
            </View>
          }
        />
        <Segmented variant="underline" options={SCOPES} value={scope} onChange={setScope} />
      </View>
      <PostList query={feed} empty={EMPTY[scope]} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + 4,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
