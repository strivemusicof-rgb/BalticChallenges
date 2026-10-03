import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import type { UserSummary } from '@/lib/types';

export function UserRow({ user, leading, trailing }: { user: UserSummary; leading?: ReactNode; trailing?: ReactNode }) {
  return (
    <Card style={styles.row} onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id } })}>
      {leading}
      <Avatar name={user.displayName} url={user.avatarUrl} />
      <View style={styles.flex}>
        <ThemedText type="smallBold">{user.displayName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          LVL {user.level}
        </ThemedText>
      </View>
      {trailing}
    </Card>
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
