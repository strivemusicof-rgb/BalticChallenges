import { useQuery } from '@tanstack/react-query';

import { api } from '../api.ts';
import type { PendingPost } from '../types.ts';
import { formatDate, QueryState, useAction } from '../ui.tsx';

type ModerationState = 'visible' | 'hidden' | 'removed';

export function Posts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['posts', 'pending'],
    queryFn: () => api.get<{ posts: PendingPost[] }>('/v1/admin/posts/pending'),
  });

  return (
    <>
      <QueryState isLoading={isLoading} error={error} empty={data?.posts.length === 0} />
      <div className="list">
        {data?.posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>
    </>
  );
}

function PostCard({ post }: { post: PendingPost }) {
  const moderate = useAction(
    (state: ModerationState) => api.post(`/v1/admin/posts/${post.id}/moderation`, { state }),
    { invalidate: [['posts']], success: 'Post updated' },
  );

  return (
    <article className="card">
      <header className="row-between">
        <strong>{post.author}</strong>
        <span className="muted small">{formatDate(post.createdAt)}</span>
      </header>
      <p className="body-text">{post.body}</p>
      <div className="actions">
        <button className="btn-success" disabled={moderate.isPending} onClick={() => moderate.mutate('visible')}>Approve</button>
        <button className="btn-amber" disabled={moderate.isPending} onClick={() => moderate.mutate('hidden')}>Hide</button>
        <button className="btn-danger" disabled={moderate.isPending} onClick={() => moderate.mutate('removed')}>Remove</button>
      </div>
    </article>
  );
}
