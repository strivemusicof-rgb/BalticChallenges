import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PostList } from '@/components/post-list';
import { EmptyState, PageTitle } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Segmented } from '@/components/ui/segmented';
import { Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import { useFeed, type FeedScope } from '@/hooks/social-queries';
import { useLocation } from '@/hooks/use-location';
import { useT } from '@/lib/i18n';

type Scope = FeedScope;
const SCOPES = [
  { id: 'following', label: 'community.following' },
  { id: 'friends', label: 'community.friends' },
  { id: 'nearby', label: 'community.nearby' },
  { id: 'global', label: 'community.global' },
] as const;

const EMPTY = {
  following: { icon: 'account-multiple-outline', title: 'community.emptyFollowing', body: 'community.emptyFollowingBody' },
  friends: { icon: 'handshake-outline', title: 'community.emptyFriends', body: 'community.emptyFriendsBody' },
  nearby: { icon: 'map-marker-radius-outline', title: 'community.emptyNearby', body: 'community.emptyNearbyBody' },
  global: { icon: 'compass-outline', title: 'community.emptyGlobal', body: 'community.emptyGlobalBody' },
} as const;

export default function CommunityScreen() {
  const t = useT();
  const [scope, setScope] = useState<Scope>('following');
  const location = useLocation();
  const feed = useFeed(scope, location.coords);
  const needsLocation = scope === 'nearby' && !location.coords;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <PageTitle
          title={t('community.title')}
          right={
            <View style={styles.actions}>
              <IconButton icon="trophy-outline" label={t('community.leaderboard')} onPress={() => router.push('/leaderboard')} background="#F0F4F1" />
              <IconButton icon="person-add-outline" label={t('community.findPeople')} onPress={() => router.push('/people')} background="#F0F4F1" />
              <IconButton icon="add" label={t('community.createPost')} onPress={() => router.push('/new-post')} background={Brand.sea} color="#FFFFFF" />
            </View>
          }
        />
        <Segmented variant="underline" options={SCOPES.map((item) => ({ ...item, label: t(item.label) }))} value={scope} onChange={setScope} />
      </View>
      {needsLocation ? (
        <View style={styles.locate}>
          <EmptyState icon="map-marker-radius-outline" title={t('community.nearbyNeedsLocation')} body={t('home.locationWhy')} />
          <Button label={t('home.useLocation')} icon="locate" variant="secondary" onPress={location.request} />
        </View>
      ) : (
        <PostList
          query={feed}
          empty={{ icon: EMPTY[scope].icon, title: t(EMPTY[scope].title), body: t(EMPTY[scope].body) }}
        />
      )}
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
  locate: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
