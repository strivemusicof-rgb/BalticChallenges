import type { UseInfiniteQueryResult } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';

import { PostCard } from '@/components/post-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen';
import { BottomTabInset, Brand, MaxContentWidth, Spacing } from '@/constants/theme';
import type { Post } from '@/lib/types';

interface PostListProps {
  query: UseInfiniteQueryResult<Post[]>;
  header?: ReactElement;
  empty: { emoji: string; title: string; body?: string };
  tabScreen?: boolean;
}

export function PostList({ query, header, empty, tabScreen = false }: PostListProps) {
  if (query.isPending) return <LoadingState />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  return (
    <FlatList
      data={query.data}
      keyExtractor={(post) => post.id}
      renderItem={({ item }) => <PostCard post={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState {...empty} />}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl tintColor={Brand.sea} refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} />
      }
      contentContainerStyle={[styles.content, { paddingBottom: (tabScreen ? BottomTabInset : 0) + Spacing.five }]}
      initialNumToRender={5}
      windowSize={7}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + 4,
  },
  footer: {
    padding: Spacing.three,
  },
});
