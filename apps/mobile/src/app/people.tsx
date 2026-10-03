import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { EmptyState, LoadingState, Screen } from '@/components/screen';
import { UserRow } from '@/components/user-row';
import { Radius, Spacing } from '@/constants/theme';
import { useUserSearch } from '@/hooks/social-queries';
import { useTheme } from '@/hooks/use-theme';

export default function PeopleScreen() {
  const theme = useTheme();
  const [q, setQ] = useState('');
  const results = useUserSearch(q);

  return (
    <Screen edges={[]}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search explorers by name"
        placeholderTextColor={theme.textSecondary}
        autoFocus
        autoCorrect={false}
        style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
      />
      {q.trim().length < 2 ? (
        <EmptyState emoji="🔍" title="Find friends" body="Type at least two letters of their display name." />
      ) : results.isPending ? (
        <LoadingState />
      ) : results.data?.length === 0 ? (
        <EmptyState emoji="🤷" title="No explorers found" />
      ) : (
        results.data?.map((user) => <UserRow key={user.id} user={user} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
});
