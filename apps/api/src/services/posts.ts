import type { DbClient } from '../db.js';
import type { PhotoStore } from './photos.js';
import { tr, type I18n } from '../i18n.js';

export interface PostQuery {
  viewerId: string | null;
  postId?: string;
  authorId?: string;
  savedBy?: string;
  /** Only posts by people the viewer follows (plus their own). */
  following?: boolean;
  /** Only posts by mutual follows (plus the viewer's own). */
  friends?: boolean;
  placeId?: string;
  /** Only posts tagged at a place within `km` of this point. */
  near?: { lat: number; lng: number; km: number };
  challengeId?: string;
  before?: string;
  limit?: number;
}

export interface PostView {
  id: string;
  kind: string;
  body: string;
  createdAt: string;
  author: { id: string; displayName: string; avatarUrl: string | null; level: number };
  photos: { id: string; url: string; width: number | null; height: number | null }[];
  locationLabel: string | null;
  place: { id: string; name: string } | null;
  challenge: { id: string; title: string } | null;
  achievement: { id: string; title: string; icon: string } | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  isMine: boolean;
  visibility: string;
}

/**
 * SQL fragment deciding whether `viewer` ($1, may be NULL) may see a row authored by `authorColumn`
 * with post-level visibility `visibilityColumn`. Applies blocks in both directions, bans, private
 * profiles and friends-only (mutual follow) content.
 */
export function canSeeSql(authorColumn: string, visibilityColumn: string | null): string {
  const friend = `(EXISTS (SELECT 1 FROM follows f1 WHERE f1.follower_id = $1 AND f1.followee_id = ${authorColumn})
                   AND EXISTS (SELECT 1 FROM follows f2 WHERE f2.follower_id = ${authorColumn} AND f2.followee_id = $1))`;
  const levelCheck = (column: string) =>
    `(${column} = 'public' OR (${column} = 'friends' AND ${friend}))`;
  return `(
    ${authorColumn} = $1::uuid OR (
      NOT EXISTS (SELECT 1 FROM users bu WHERE bu.id = ${authorColumn} AND bu.banned_at IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = $1 AND b.blocked_id = ${authorColumn})
                                              OR (b.blocker_id = ${authorColumn} AND b.blocked_id = $1))
      AND ${levelCheck(`(SELECT pv.profile_visibility FROM users pv WHERE pv.id = ${authorColumn})`)}
      ${visibilityColumn ? `AND ${levelCheck(visibilityColumn)}` : ''}
    ))`;
}

interface PostRow {
  id: string;
  kind: string;
  body: string;
  created_at: Date;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  location_label: string | null;
  show_location: boolean;
  place_id: string | null;
  place_name: string | null;
  challenge_id: string | null;
  challenge_title: string | null;
  challenge_i18n: I18n;
  place_i18n: I18n;
  achievement_i18n: I18n;
  achievement_id: string | null;
  achievement_title: string | null;
  achievement_icon: string | null;
  like_count: number;
  comment_count: number;
  liked: boolean;
  saved: boolean;
  visibility: string;
  photos: { id: string; key: string; width: number | null; height: number | null }[];
}

export async function loadPosts(db: DbClient, photos: PhotoStore, query: PostQuery): Promise<PostView[]> {
  const params: unknown[] = [query.viewerId];
  const where = [`(p.moderation = 'visible' OR (p.user_id = $1::uuid AND p.moderation = 'pending'))`, canSeeSql('p.user_id', 'p.visibility')];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (query.postId) where.push(`p.id = ${add(query.postId)}`);
  if (query.authorId) where.push(`p.user_id = ${add(query.authorId)}`);
  if (query.placeId) where.push(`p.place_id = ${add(query.placeId)} AND p.show_location`);
  if (query.challengeId) where.push(`p.challenge_id = ${add(query.challengeId)}`);
  if (query.savedBy) where.push(`EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = ${add(query.savedBy)})`);
  if (query.following) {
    where.push(`(p.user_id = $1 OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.followee_id = p.user_id))`);
  }
  if (query.friends) {
    where.push(`(p.user_id = $1 OR (
      EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.followee_id = p.user_id) AND
      EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = p.user_id AND f.followee_id = $1)))`);
  }
  if (query.near) {
    where.push(
      `p.show_location AND ST_DWithin(pl.geog, ST_SetSRID(ST_MakePoint(${add(query.near.lng)}::float8, ${add(query.near.lat)}::float8), 4326)::geography, ${add(query.near.km * 1000)})`,
    );
  }
  if (query.before) where.push(`p.created_at < ${add(query.before)}`);
  const limit = add(Math.min(query.limit ?? 20, 50));

  const { rows } = await db.query<PostRow>(
    `SELECT p.id, p.kind, p.body, p.created_at, p.user_id, u.display_name, u.avatar_url, u.level,
            p.location_label, p.show_location, p.visibility,
            p.place_id, pl.name AS place_name, pl.i18n AS place_i18n, p.challenge_id, ch.title AS challenge_title, ch.i18n AS challenge_i18n,
            p.achievement_id, ac.title AS achievement_title, ac.i18n AS achievement_i18n, ac.icon AS achievement_icon,
            p.like_count, p.comment_count,
            EXISTS (SELECT 1 FROM post_likes l WHERE l.post_id = p.id AND l.user_id = $1) AS liked,
            EXISTS (SELECT 1 FROM post_saves s WHERE s.post_id = p.id AND s.user_id = $1) AS saved,
            coalesce((SELECT json_agg(json_build_object('id', ph.id, 'key', ph.storage_key, 'width', ph.width, 'height', ph.height)
                                      ORDER BY pp.position)
                      FROM post_photos pp JOIN photos ph ON ph.id = pp.photo_id
                      WHERE pp.post_id = p.id AND ph.moderation = 'visible'), '[]') AS photos
     FROM posts p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN places pl ON pl.id = p.place_id
     LEFT JOIN challenges ch ON ch.id = p.challenge_id
     LEFT JOIN achievements ac ON ac.id = p.achievement_id
     WHERE ${where.join(' AND ')}
     ORDER BY p.created_at DESC
     LIMIT ${limit}`,
    params,
  );

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    body: row.body,
    createdAt: row.created_at.toISOString(),
    author: { id: row.user_id, displayName: row.display_name, avatarUrl: row.avatar_url, level: row.level },
    photos: row.photos.map((photo) => ({
      id: photo.id,
      url: photos.urlFor(photo.key),
      width: photo.width,
      height: photo.height,
    })),
    locationLabel: row.show_location ? row.location_label : null,
    place: row.show_location && row.place_id ? { id: row.place_id, name: tr(row.place_i18n, 'name', row.place_name!) } : null,
    challenge: row.challenge_id ? { id: row.challenge_id, title: tr(row.challenge_i18n, 'title', row.challenge_title!) } : null,
    achievement: row.achievement_id
      ? { id: row.achievement_id, title: tr(row.achievement_i18n, 'title', row.achievement_title!), icon: row.achievement_icon! }
      : null,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    likedByMe: row.liked,
    savedByMe: row.saved,
    isMine: row.user_id === query.viewerId,
    visibility: row.visibility,
  }));
}
