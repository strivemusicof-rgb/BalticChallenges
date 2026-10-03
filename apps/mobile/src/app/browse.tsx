import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ChallengeCard } from '@/components/challenge-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCategories, useChallenges } from '@/hooks/queries';
import { useLocation } from '@/hooks/use-location';

export default function BrowseScreen() {
  const location = useLocation();
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const query = search.trim().length >= 2 ? search.trim() : undefined;

  const categories = useCategories();
  const challenges = useChallenges({ coords: location.coords, category, q: query, limit: 200 });
  const topCategories = (categories.data ?? []).filter((item) => item.parentId === null && item.challengeCount > 0);

  const header = (
    <View style={styles.header}>
      <View style={styles.search}>
        <Icon name="search" size={18} color="#7C8A83" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search castles, beaches, towns…"
          placeholderTextColor="#8A9790"
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={styles.input}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.bleed}>
        <Chip label="All" selected={!category} onPress={() => setCategory(undefined)} />
        {topCategories.map((item) => (
          <Chip
            key={item.id}
            label={`${item.icon} ${item.name}`}
            selected={category === item.id}
            onPress={() => setCategory(category === item.id ? undefined : item.id)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <FlatList
      style={styles.screen}
      data={challenges.data ?? []}
      keyExtractor={(challenge) => challenge.id}
      renderItem={({ item }) => <ChallengeCard challenge={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        challenges.isPending ? (
          <LoadingState />
        ) : challenges.isError ? (
          <ErrorState error={challenges.error} onRetry={() => challenges.refetch()} />
        ) : (
          <EmptyState emoji="🔎" title="No challenges found" body="Try another category or search term." />
        )
      }
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={8}
      windowSize={7}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FFFFFF',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three + 4,
    paddingTop: Spacing.two,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.three,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#F2F5F3',
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#15211B',
    paddingVertical: Spacing.two,
  },
  bleed: {
    marginHorizontal: -(Spacing.three + 4),
  },
  chips: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three + 4,
  },
});
