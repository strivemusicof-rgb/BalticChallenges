import { PostList } from '@/components/post-list';
import { useSavedPosts } from '@/hooks/social-queries';
import { useT } from '@/lib/i18n';

export default function SavedScreen() {
  const t = useT();
  const saved = useSavedPosts();
  return <PostList query={saved} empty={{ icon: 'bookmark-outline', title: t('saved.empty'), body: t('saved.emptyBody') }} />;
}
