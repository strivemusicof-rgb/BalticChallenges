import { PostList } from '@/components/post-list';
import { useSavedPosts } from '@/hooks/social-queries';

export default function SavedScreen() {
  const saved = useSavedPosts();
  return <PostList query={saved} empty={{ emoji: '🔖', title: 'Nothing saved yet', body: 'Tap 📑 on a post to keep it for later.' }} />;
}
