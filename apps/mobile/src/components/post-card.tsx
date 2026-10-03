import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { HexBadge } from '@/components/ui/hex-badge';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useBlock, useDeletePost, useReport, useToggleLike, useToggleSave } from '@/hooks/social-queries';
import { showAlert } from '@/lib/dialog';
import { timeAgo } from '@/lib/format';
import { askReportReason, confirmBlock, reportReceived } from '@/lib/moderation-actions';
import type { Post } from '@/lib/types';

function LikeButton({ post }: { post: Post }) {
  const like = useToggleLike();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Pressable
      onPress={() => {
        if (!post.likedByMe) scale.set(withSequence(withSpring(1.35, { damping: 6 }), withSpring(1)));
        like.mutate(post);
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={post.likedByMe ? 'Unlike' : 'Like'}
      style={styles.action}>
      <Animated.View style={animated}>
        <Icon name={post.likedByMe ? 'heart' : 'heart-outline'} size={22} color={post.likedByMe ? '#E5484D' : '#33433A'} />
      </Animated.View>
      <ThemedText style={styles.count}>{post.likeCount}</ThemedText>
    </Pressable>
  );
}

function PostCardBase({ post, detail = false }: { post: Post; detail?: boolean }) {
  const save = useToggleSave();
  const [photoWidth, setPhotoWidth] = useState(0);
  const report = useReport();
  const block = useBlock();
  const remove = useDeletePost();

  const openPost = detail ? undefined : () => router.push({ pathname: '/post/[id]', params: { id: post.id } });
  const openAuthor = () => router.push({ pathname: '/user/[id]', params: { id: post.author.id } });

  function showMenu() {
    if (post.isMine) {
      showAlert('Your post', undefined, [
        {
          text: 'Delete post',
          style: 'destructive',
          onPress: () => remove.mutate(post.id, { onSuccess: () => detail && router.back() }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    showAlert(post.author.displayName, undefined, [
      {
        text: 'Report post',
        onPress: async () => {
          const reason = await askReportReason('post');
          if (reason) report.mutate({ targetType: 'post', targetId: post.id, reason }, { onSuccess: reportReceived });
        },
      },
      {
        text: `Block ${post.author.displayName}`,
        style: 'destructive',
        onPress: async () => {
          if (await confirmBlock(post.author.displayName)) block.mutate({ id: post.author.id, block: true });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const attachment = post.challenge
    ? { icon: '🏆', title: post.challenge.title, onPress: () => router.push({ pathname: '/challenge/[id]', params: { id: post.challenge!.id } }) }
    : post.achievement
      ? { icon: post.achievement.icon, title: post.achievement.title, onPress: () => router.push('/achievements') }
      : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable onPress={openAuthor} style={styles.author} accessibilityRole="link">
          <Avatar name={post.author.displayName} url={post.author.avatarUrl} size={40} />
          <View style={styles.flex}>
            <ThemedText type="smallBold">{post.author.displayName}</ThemedText>
            <ThemedText style={styles.meta} numberOfLines={1}>
              {timeAgo(post.createdAt)}
              {post.locationLabel ? ` · ${post.locationLabel}` : ''}
            </ThemedText>
          </View>
        </Pressable>
        <Pressable onPress={showMenu} hitSlop={12} accessibilityLabel="Post options" accessibilityRole="button">
          <Icon name="ellipsis-horizontal" size={20} color="#6B7A72" />
        </Pressable>
      </View>

      {post.body.length > 0 && (
        <Pressable onPress={openPost} disabled={!openPost}>
          <ThemedText style={styles.body} numberOfLines={detail ? undefined : 5}>
            {post.body}
          </ThemedText>
        </Pressable>
      )}

      {post.photos.length > 0 && (
        <View onLayout={(event) => setPhotoWidth(event.nativeEvent.layout.width)} style={styles.photos}>
          {photoWidth > 0 && (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {post.photos.map((photo) => (
                <Pressable key={photo.id} onPress={openPost} disabled={!openPost}>
                  <Image
                    source={photo.url}
                    style={{
                      width: photoWidth,
                      height: photoWidth / (photo.width && photo.height ? Math.max(photo.width / photo.height, 0.8) : 4 / 3),
                    }}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                    accessibilityLabel={`Photo by ${post.author.displayName}`}
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {attachment && (
        <PressableScale onPress={attachment.onPress} scaleTo={0.98} style={styles.attachment}>
          <HexBadge icon={attachment.icon} size={38} />
          <View style={styles.flex}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {attachment.title}
            </ThemedText>
            <View style={styles.completed}>
              <ThemedText style={styles.completedText}>{post.challenge ? 'Completed' : 'Badge unlocked'}</ThemedText>
              <Icon name="checkmark-circle-outline" size={14} color={Brand.success} />
            </View>
          </View>
        </PressableScale>
      )}

      <View style={styles.actions}>
        <LikeButton post={post} />
        <Pressable onPress={openPost} hitSlop={8} accessibilityRole="button" accessibilityLabel="Comments" style={styles.action}>
          <Icon name="chatbubble-outline" size={20} color="#33433A" />
          <ThemedText style={styles.count}>{post.commentCount}</ThemedText>
        </Pressable>
        <View style={styles.flex} />
        <Pressable
          onPress={() => save.mutate(post)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={post.savedByMe ? 'Remove from saved' : 'Save'}>
          <Icon name={post.savedByMe ? 'bookmark' : 'bookmark-outline'} size={20} color={post.savedByMe ? Brand.sea : '#33433A'} />
        </Pressable>
      </View>
    </View>
  );
}

export const PostCard = memo(PostCardBase);

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two + 2,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E6ECE8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  author: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  flex: {
    flex: 1,
  },
  meta: {
    fontSize: 12,
    color: '#7C8A83',
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  photos: {
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two + 2,
    borderRadius: Radius.medium,
    backgroundColor: '#F5F8F6',
  },
  completed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: 700,
    color: Brand.success,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    fontSize: 14,
    fontWeight: 600,
    color: '#33433A',
  },
});
