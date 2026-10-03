import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PostCard } from '@/components/post-card';
import { ErrorState, LoadingState, Screen, SectionHeader } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useAddComment, useComments, useDeleteComment, usePost, useReport } from '@/hooks/social-queries';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/format';
import { askReportReason, reportReceived } from '@/lib/moderation-actions';
import type { Comment } from '@/lib/types';
import { showAlert } from '@/lib/dialog';

export default function PostScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const post = usePost(id);
  const comments = useComments(id);
  const add = useAddComment(id);
  const remove = useDeleteComment(id);
  const report = useReport();
  const [draft, setDraft] = useState('');

  if (post.isPending) return <LoadingState />;
  if (post.isError) return <ErrorState error={post.error} onRetry={() => post.refetch()} />;

  function commentMenu(comment: Comment) {
    const canDelete = comment.isMine || post.data?.isMine;
    showAlert(comment.author.displayName, undefined, [
      ...(canDelete
        ? [{ text: 'Delete comment', style: 'destructive' as const, onPress: () => remove.mutate(comment.id) }]
        : []),
      ...(!comment.isMine
        ? [
            {
              text: 'Report comment',
              onPress: async () => {
                const reason = await askReportReason('comment');
                if (reason) report.mutate({ targetType: 'comment', targetId: comment.id, reason }, { onSuccess: reportReceived });
              },
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  function send() {
    const body = draft.trim();
    if (!body) return;
    add.mutate(body, {
      onSuccess: () => setDraft(''),
      onError: (error) => showAlert('Could not comment', error.message),
    });
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Screen edges={[]} refreshing={comments.isRefetching} onRefresh={() => void comments.refetch()}>
        <PostCard post={post.data} detail />
        <SectionHeader title={`Comments (${post.data.commentCount})`} />
        {comments.data?.map((comment) => (
          <Pressable key={comment.id} onLongPress={() => commentMenu(comment)} style={styles.comment}>
            <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: comment.author.id } })}>
              <Avatar name={comment.author.displayName} url={comment.author.avatarUrl} size={32} />
            </Pressable>
            <View style={[styles.bubble, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">
                {comment.author.displayName}{' '}
                <ThemedText type="small" themeColor="textSecondary">
                  {timeAgo(comment.createdAt)}
                </ThemedText>
              </ThemedText>
              <ThemedText>{comment.body}</ThemedText>
            </View>
            <Pressable onPress={() => commentMenu(comment)} hitSlop={10} accessibilityLabel="Comment options">
              <ThemedText themeColor="textSecondary">⋯</ThemedText>
            </Pressable>
          </Pressable>
        ))}
        {comments.data?.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            No comments yet. Say something nice!
          </ThemedText>
        )}
      </Screen>
      <View style={[styles.composer, { borderColor: theme.border, backgroundColor: theme.background }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment…"
          placeholderTextColor={theme.textSecondary}
          maxLength={1000}
          multiline
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
        <Button label="Send" disabled={!draft.trim()} loading={add.isPending} onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  comment: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  bubble: {
    flex: 1,
    borderRadius: Radius.medium,
    padding: Spacing.two + 2,
    gap: Spacing.half,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.two,
    paddingBottom: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
  },
});
