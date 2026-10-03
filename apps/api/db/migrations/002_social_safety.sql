-- Social, moderation, subscriptions and audit. Tables exist from day one so the
-- API can grow into them without reshaping the core model.

CREATE TYPE moderation_state AS ENUM ('visible', 'pending', 'hidden', 'removed');

CREATE TABLE photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key   text NOT NULL UNIQUE,
  mime_type     text NOT NULL,
  width         integer,
  height        integer,
  bytes         integer NOT NULL,
  -- Perceptual hash for duplicate-photo detection.
  phash         bit(64),
  moderation    moderation_state NOT NULL DEFAULT 'visible',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX photos_user_idx ON photos(user_id);

ALTER TABLE check_ins ADD COLUMN photo_id uuid REFERENCES photos(id) ON DELETE SET NULL;

CREATE TABLE posts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind             text NOT NULL CHECK (kind IN ('adventure', 'achievement', 'discovery', 'route')),
  body             text NOT NULL DEFAULT '' CHECK (char_length(body) <= 2000),
  place_id         uuid REFERENCES places(id) ON DELETE SET NULL,
  challenge_id     uuid REFERENCES challenges(id) ON DELETE SET NULL,
  achievement_id   text REFERENCES achievements(id) ON DELETE SET NULL,
  -- Shown to others instead of coordinates, e.g. "Cēsis, Latvia".
  location_label   text,
  show_location    boolean NOT NULL DEFAULT true,
  visibility       visibility NOT NULL DEFAULT 'public',
  moderation       moderation_state NOT NULL DEFAULT 'visible',
  like_count       integer NOT NULL DEFAULT 0,
  comment_count    integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_user_time_idx ON posts(user_id, created_at DESC);
CREATE INDEX posts_feed_idx ON posts(created_at DESC) WHERE moderation = 'visible';
CREATE INDEX posts_place_idx ON posts(place_id);
CREATE TRIGGER posts_touch BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE post_photos (
  post_id   uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  photo_id  uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  position  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (post_id, photo_id)
);

CREATE TABLE comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  moderation  moderation_state NOT NULL DEFAULT 'visible',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_post_idx ON comments(post_id, created_at);

CREATE TABLE post_likes (
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE post_saves (
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Friends are mutual follows.
CREATE TABLE follows (
  follower_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX follows_followee_idx ON follows(followee_id);

CREATE TABLE blocks (
  blocker_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
CREATE INDEX blocks_blocked_idx ON blocks(blocked_id);

CREATE TABLE reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  target_type   text NOT NULL CHECK (target_type IN ('post', 'comment', 'user', 'photo', 'check_in', 'challenge')),
  target_id     uuid NOT NULL,
  reason        text NOT NULL CHECK (reason IN ('spam', 'abuse', 'nudity', 'violence', 'fake_completion', 'unsafe', 'other')),
  details       text CHECK (char_length(details) <= 1000),
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'dismissed')),
  resolved_by   uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reports_open_idx ON reports(created_at) WHERE status = 'open';
CREATE UNIQUE INDEX reports_one_per_reporter ON reports(reporter_id, target_type, target_id) WHERE status = 'open';

-- Store-verified subscription state; the app never decides entitlements itself.
CREATE TABLE subscriptions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store                    text NOT NULL CHECK (store IN ('app_store', 'play_store', 'promo')),
  product_id               text NOT NULL,
  original_transaction_id  text NOT NULL,
  status                   text NOT NULL CHECK (status IN ('trial', 'active', 'grace', 'expired', 'revoked')),
  current_period_end       timestamptz NOT NULL,
  auto_renew               boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store, original_transaction_id)
);
CREATE INDEX subscriptions_user_idx ON subscriptions(user_id);
CREATE TRIGGER subscriptions_touch BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE admin_audit_log (
  id           bigserial PRIMARY KEY,
  actor_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  action       text NOT NULL,
  target_type  text NOT NULL,
  target_id    text NOT NULL,
  details      jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_log_target_idx ON admin_audit_log(target_type, target_id);
