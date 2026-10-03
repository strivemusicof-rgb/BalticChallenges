import { Stack, useLocalSearchParams } from 'expo-router';

import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/screen';
import { UserRow } from '@/components/user-row';
import { useFollowList } from '@/hooks/social-queries';
import { useT } from '@/lib/i18n';

export default function FollowsScreen() {
  const t = useT();
  const { id, direction } = useLocalSearchParams<{ id: string; direction: 'followers' | 'following' }>();
  const list = useFollowList(id, direction === 'following' ? 'following' : 'followers');

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: direction === 'following' ? t('titles.following') : t('titles.followers') }} />
      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState icon="account-multiple-outline" title={t('follows.empty')} />
      ) : (
        list.data.map((user) => <UserRow key={user.id} user={user} />)
      )}
    </Screen>
  );
}
