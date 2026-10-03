-- Phase 3 / 3.5: profiles, counters, legal acceptance, moderation details.

ALTER TABLE users
  ADD COLUMN bio text NOT NULL DEFAULT '' CHECK (char_length(bio) <= 300),
  ADD COLUMN terms_version text,
  ADD COLUMN terms_accepted_at timestamptz,
  ADD COLUMN ban_reason text;

CREATE INDEX users_display_name_trgm_idx ON users (lower(display_name) text_pattern_ops);

-- Cached counters on posts, kept exact by triggers so feeds never count rows.
CREATE FUNCTION post_like_counter() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSE
    UPDATE posts SET like_count = greatest(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER post_likes_count AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION post_like_counter();

CREATE FUNCTION post_comment_counter() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.moderation = 'visible' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.moderation = 'visible' THEN
    UPDATE posts SET comment_count = greatest(comment_count - 1, 0) WHERE id = OLD.post_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.moderation IS DISTINCT FROM NEW.moderation THEN
    UPDATE posts SET comment_count = greatest(comment_count
      + CASE WHEN NEW.moderation = 'visible' THEN 1 ELSE 0 END
      - CASE WHEN OLD.moderation = 'visible' THEN 1 ELSE 0 END, 0)
    WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER comments_count AFTER INSERT OR DELETE OR UPDATE OF moderation ON comments
  FOR EACH ROW EXECUTE FUNCTION post_comment_counter();

CREATE INDEX post_photos_photo_idx ON post_photos(photo_id);
CREATE INDEX xp_events_time_idx ON xp_events(created_at, user_id);

ALTER TABLE reports
  ADD COLUMN resolution_note text CHECK (char_length(resolution_note) <= 1000);

ALTER TABLE check_ins
  ADD COLUMN reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN reviewed_at timestamptz;
