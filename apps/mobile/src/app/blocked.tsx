import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { EmptyState, ErrorState, LoadingState, Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useBlock, useBlockedUsers } from '@/hooks/social-queries';

export default function BlockedScreen() {
  const blocked = useBlockedUsers();
  const block = useBlock();

  if (blocked.isPending) return <LoadingState />;
  if (blocked.isError) return <ErrorState error={blocked.error} onRetry={() => blocked.refetch()} />;

  return (
    <Screen edges={[]}>
      {blocked.data.length === 0 ? (
        <EmptyState emoji="🕊️" title="You haven't blocked anyone" />
      ) : (
        blocked.data.map((user) => (
          <Card key={user.id} style={styles.row}>
            <Avatar name={user.displayName} url={user.avatarUrl} />
            <ThemedText type="smallBold" style={styles.flex}>
              {user.displayName}
            </ThemedText>
            <View>
              <Button
                variant="secondary"
                label="Unblock"
                loading={block.isPending && block.variables?.id === user.id}
                onPress={() => block.mutate({ id: user.id, block: false })}
              />
            </View>
          </Card>
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
  },
  flex: {
    flex: 1,
  },
});
