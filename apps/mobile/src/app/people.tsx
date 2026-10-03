import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { EmptyState, LoadingState, Screen } from '@/components/screen';
import { Icon } from '@/components/ui/icon';
import { UserRow } from '@/components/user-row';
import { Radius, Spacing } from '@/constants/theme';
import { useUserSearch } from '@/hooks/social-queries';
import { useT } from '@/lib/i18n';

export default function PeopleScreen() {
  const t = useT();
  const [q, setQ] = useState('');
  const results = useUserSearch(q);

  return (
    <Screen edges={['bottom']}>
      <View style={styles.search}>
        <Icon name="search" size={18} color="#7C8A83" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t('people.search')}
          placeholderTextColor="#8A9790"
          autoFocus
          autoCorrect={false}
          style={styles.input}
        />
      </View>
      {q.trim().length < 2 ? (
        <EmptyState icon="account-search-outline" title={t('people.findTitle')} body={t('people.findBody')} />
      ) : results.isPending ? (
        <LoadingState />
      ) : results.data?.length === 0 ? (
        <EmptyState icon="account-question-outline" title={t('people.none')} />
      ) : (
        results.data?.map((user) => <UserRow key={user.id} user={user} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#F2F5F3',
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#15211B',
    paddingVertical: Spacing.two,
  },
});
