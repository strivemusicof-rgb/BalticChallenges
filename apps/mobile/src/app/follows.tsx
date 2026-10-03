import { Stack, useLocalSearchParams } from 'expo-router';

import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/screen';
import { UserRow } from '@/components/user-row';
import { useFollowList } from '@/hooks/social-queries';

export default function FollowsScreen() {
  const { id, direction } = useLocalSearchParams<{ id: string; direction: 'followers' | 'following' }>();
  const list = useFollowList(id, direction === 'following' ? 'following' : 'followers');

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: direction === 'following' ? 'Following' : 'Followers' }} />
      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState emoji="👥" title="Nobody here yet" />
      ) : (
        list.data.map((user) => <UserRow key={user.id} user={user} />)
      )}
    </Screen>
  );
}
