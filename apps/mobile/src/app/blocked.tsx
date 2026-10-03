import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useBlock, useBlockedUsers } from '@/hooks/social-queries';
import { useT } from '@/lib/i18n';

export default function BlockedScreen() {
  const t = useT();
  const blocked = useBlockedUsers();
  const block = useBlock();

  if (blocked.isPending) return <LoadingState />;
  if (blocked.isError) return <ErrorState error={blocked.error} onRetry={() => blocked.refetch()} />;

  return (
    <Screen edges={['bottom']}>
      {blocked.data.length === 0 ? (
        <EmptyState icon="account-cancel-outline" title={t('blocked.none')} />
      ) : (
        blocked.data.map((user) => (
          <View key={user.id} style={styles.row}>
            <Avatar name={user.displayName} url={user.avatarUrl} />
            <ThemedText type="smallBold" style={styles.flex}>
              {user.displayName}
            </ThemedText>
            <Button
              variant="secondary"
              size="small"
              label={t('blocked.unblock')}
              loading={block.isPending && block.variables?.id === user.id}
              onPress={() => block.mutate({ id: user.id, block: false })}
            />
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two + 2,
    borderRadius: Radius.large,
    backgroundColor: '#F7F9F8',
  },
  flex: {
    flex: 1,
  },
});
