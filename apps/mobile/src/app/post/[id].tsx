import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PostCard } from '@/components/post-card';
import { ErrorState, LoadingState, Screen, SectionHeader } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useAddComment, useComments, useDeleteComment, usePost, useReport } from '@/hooks/social-queries';
import { showAlert } from '@/lib/dialog';
import { timeAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { askReportReason, reportReceived } from '@/lib/moderation-actions';
import type { Comment } from '@/lib/types';

export default function PostScreen() {
  const t = useT();
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
      ...(canDelete ? [{ text: t('post.deleteComment'), style: 'destructive' as const, onPress: () => remove.mutate(comment.id) }] : []),
      ...(!comment.isMine
        ? [
            {
              text: t('post.reportComment'),
              onPress: async () => {
                const reason = await askReportReason('comment');
                if (reason) report.mutate({ targetType: 'comment', targetId: comment.id, reason }, { onSuccess: reportReceived });
              },
            },
          ]
        : []),
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  }

  function send() {
    const body = draft.trim();
    if (!body) return;
    add.mutate(body, {
      onSuccess: () => setDraft(''),
      onError: (error) => showAlert(t('post.commentFailed'), error.message),
    });
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Screen edges={[]} refreshing={comments.isRefetching} onRefresh={() => void comments.refetch()}>
        <PostCard post={post.data} detail />
        <SectionHeader title={t('post.commentsTitle', { count: post.data.commentCount })} />
        {comments.data?.map((comment) => (
          <Pressable key={comment.id} onLongPress={() => commentMenu(comment)} style={styles.comment}>
            <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: comment.author.id } })}>
              <Avatar name={comment.author.displayName} url={comment.author.avatarUrl} size={34} />
            </Pressable>
            <View style={styles.bubble}>
              <View style={styles.bubbleHeader}>
                <ThemedText type="smallBold">{comment.author.displayName}</ThemedText>
                <ThemedText style={styles.time}>{timeAgo(comment.createdAt)}</ThemedText>
              </View>
              <ThemedText style={styles.body}>{comment.body}</ThemedText>
            </View>
            <Pressable onPress={() => commentMenu(comment)} hitSlop={10} accessibilityLabel={t('post.commentOptions')}>
              <Icon name="ellipsis-horizontal" size={18} color="#9AA7A0" />
            </Pressable>
          </Pressable>
        ))}
        {comments.data?.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            {t('post.noComments')}
          </ThemedText>
        )}
      </Screen>
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('post.addComment')}
          placeholderTextColor="#8A9790"
          maxLength={1000}
          multiline
          style={styles.input}
        />
        <PressableScale
          onPress={send}
          disabled={!draft.trim() || add.isPending}
          accessibilityLabel={t('post.send')}
          style={[styles.send, (!draft.trim() || add.isPending) && styles.sendDisabled]}>
          <Icon name="arrow-up" size={20} color="#FFFFFF" />
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  comment: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
    alignItems: 'flex-start',
  },
  bubble: {
    flex: 1,
    borderRadius: Radius.medium,
    padding: Spacing.two + 4,
    gap: 2,
    backgroundColor: '#F4F7F5',
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  time: {
    fontSize: 12,
    color: '#8A9790',
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.two + 2,
    paddingBottom: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E6ECE8',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
    color: '#15211B',
    backgroundColor: '#F2F5F3',
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.sea,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
});
