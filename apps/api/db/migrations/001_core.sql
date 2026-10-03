-- Core game model: users, auth, places, challenges, progression.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE country_code AS ENUM ('LV', 'LT', 'EE');
CREATE TYPE difficulty AS ENUM ('casual', 'explorer', 'adventurer', 'extreme');
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE challenge_type AS ENUM (
  'visit', 'discover', 'photo', 'collection', 'route',
  'multi_step', 'seasonal', 'social', 'time_limited'
);
CREATE TYPE verification_type AS ENUM ('gps', 'gps_checkin', 'photo', 'gps_photo', 'route', 'manual');
CREATE TYPE attempt_status AS ENUM ('in_progress', 'completed', 'abandoned', 'rejected', 'flagged');
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
CREATE TYPE visibility AS ENUM ('public', 'friends', 'private');

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users & auth -----------------------------------------------------------

CREATE TABLE users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               citext UNIQUE,
  display_name        text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  avatar_url          text,
  role                user_role NOT NULL DEFAULT 'user',
  -- Cached sum of xp_events; always updated in the same transaction as the ledger.
  xp                  integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level               integer NOT NULL DEFAULT 1,
  difficulty          difficulty NOT NULL DEFAULT 'explorer',
  interests           text[] NOT NULL DEFAULT '{}',
  countries           country_code[] NOT NULL DEFAULT '{LV,LT,EE}',
  profile_visibility  visibility NOT NULL DEFAULT 'public',
  show_post_location  boolean NOT NULL DEFAULT true,
  onboarded_at        timestamptz,
  banned_at           timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER users_touch BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE auth_identities (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider          text NOT NULL CHECK (provider IN ('email', 'apple', 'google')),
  provider_subject  text NOT NULL,
  password_hash     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject),
  CHECK (provider <> 'email' OR password_hash IS NOT NULL)
);
CREATE INDEX auth_identities_user_idx ON auth_identities(user_id);

CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  bytea NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  replaced_by uuid REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens(user_id);

-- Geography & taxonomy -----------------------------------------------------

CREATE TABLE regions (
  id       serial PRIMARY KEY,
  country  country_code NOT NULL,
  slug     text NOT NULL UNIQUE,
  name     text NOT NULL
);

CREATE TABLE categories (
  id         text PRIMARY KEY,
  parent_id  text REFERENCES categories(id),
  name       text NOT NULL,
  icon       text NOT NULL,
  sort       integer NOT NULL DEFAULT 0
);

CREATE TABLE places (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text NOT NULL UNIQUE,
  name              text NOT NULL,
  description       text NOT NULL DEFAULT '',
  country           country_code NOT NULL,
  region_id         integer REFERENCES regions(id),
  city              text,
  category_id       text NOT NULL REFERENCES categories(id),
  geog              geography(Point, 4326) NOT NULL,
  -- GPS verification radius around the point.
  radius_m          integer NOT NULL DEFAULT 150 CHECK (radius_m BETWEEN 20 AND 5000),
  images            text[] NOT NULL DEFAULT '{}',
  -- Safety metadata (roadmap section 34).
  difficulty        difficulty NOT NULL DEFAULT 'casual',
  terrain           text,
  accessibility     text,
  season_months     smallint[] NOT NULL DEFAULT '{1,2,3,4,5,6,7,8,9,10,11,12}',
  est_duration_min  integer,
  family_friendly   boolean,
  dog_friendly      boolean,
  parking           boolean,
  opening_hours     jsonb,
  official_url      text,
  temporarily_closed boolean NOT NULL DEFAULT false,
  status            content_status NOT NULL DEFAULT 'draft',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX places_geog_idx ON places USING gist (geog);
CREATE INDEX places_country_idx ON places(country) WHERE status = 'published';
CREATE TRIGGER places_touch BEFORE UPDATE ON places FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Challenges ---------------------------------------------------------------

CREATE TABLE challenges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  title         text NOT NULL,
  description   text NOT NULL DEFAULT '',
  type          challenge_type NOT NULL,
  category_id   text NOT NULL REFERENCES categories(id),
  place_id      uuid REFERENCES places(id),
  country       country_code,
  region_id     integer REFERENCES regions(id),
  difficulty    difficulty NOT NULL DEFAULT 'casual',
  xp_reward     integer NOT NULL CHECK (xp_reward > 0 AND xp_reward <= 5000),
  verification  verification_type NOT NULL,
  requirements  jsonb NOT NULL DEFAULT '{}',
  images        text[] NOT NULL DEFAULT '{}',
  starts_at     timestamptz,
  ends_at       timestamptz,
  is_pro        boolean NOT NULL DEFAULT false,
  status        content_status NOT NULL DEFAULT 'draft',
  created_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CHECK (type NOT IN ('visit', 'discover') OR place_id IS NOT NULL)
);
CREATE INDEX challenges_place_idx ON challenges(place_id);
CREATE INDEX challenges_live_idx ON challenges(status, country, category_id);
CREATE TRIGGER challenges_touch BEFORE UPDATE ON challenges FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Ordered checkpoints for multi-step / route challenges.
CREATE TABLE challenge_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id  uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  position      integer NOT NULL,
  title         text NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('visit', 'photo', 'walk', 'route')),
  place_id      uuid REFERENCES places(id),
  geog          geography(Point, 4326),
  radius_m      integer CHECK (radius_m BETWEEN 20 AND 5000),
  requirements  jsonb NOT NULL DEFAULT '{}',
  UNIQUE (challenge_id, position)
);

CREATE TABLE challenge_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id  uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  status        attempt_status NOT NULL DEFAULT 'in_progress',
  steps_done    integer NOT NULL DEFAULT 0,
  xp_awarded    integer NOT NULL DEFAULT 0,
  started_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX challenge_attempts_one_live
  ON challenge_attempts(user_id, challenge_id)
  WHERE status IN ('in_progress', 'completed', 'flagged');
CREATE INDEX challenge_attempts_user_idx ON challenge_attempts(user_id, status);
CREATE TRIGGER challenge_attempts_touch BEFORE UPDATE ON challenge_attempts FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Every location proof the client submits, accepted or not (anti-cheat audit trail).
CREATE TABLE check_ins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_id    uuid REFERENCES challenge_attempts(id) ON DELETE CASCADE,
  step_id       uuid REFERENCES challenge_steps(id) ON DELETE SET NULL,
  geog          geography(Point, 4326) NOT NULL,
  accuracy_m    real,
  is_mocked     boolean NOT NULL DEFAULT false,
  device_time   timestamptz,
  received_at   timestamptz NOT NULL DEFAULT now(),
  distance_m    real,
  verdict       text NOT NULL CHECK (verdict IN ('accepted', 'rejected', 'flagged')),
  reason        text
);
CREATE INDEX check_ins_user_time_idx ON check_ins(user_id, received_at DESC);

-- Collections --------------------------------------------------------------

CREATE TABLE collections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  title        text NOT NULL,
  description  text NOT NULL DEFAULT '',
  icon         text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('country', 'category', 'seasonal', 'special')),
  country      country_code,
  xp_reward    integer NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  starts_at    timestamptz,
  ends_at      timestamptz,
  is_pro       boolean NOT NULL DEFAULT false,
  status       content_status NOT NULL DEFAULT 'draft',
  sort         integer NOT NULL DEFAULT 0
);

CREATE TABLE collection_items (
  collection_id  uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  challenge_id   uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  position       integer NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, challenge_id)
);
CREATE INDEX collection_items_challenge_idx ON collection_items(challenge_id);

CREATE TABLE user_collections (
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_id  uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  completed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, collection_id)
);

-- Progression --------------------------------------------------------------

CREATE TABLE levels (
  level        integer PRIMARY KEY CHECK (level >= 1),
  xp_required  integer NOT NULL UNIQUE CHECK (xp_required >= 0),
  title        text NOT NULL
);

-- rule examples:
--   {"type":"challenges_completed","count":5}
--   {"type":"category_completed","category":"castles","count":5}
--   {"type":"countries_visited","count":3}
--   {"type":"collection_completed","collection":"discover-latvia"}
CREATE TABLE achievements (
  id           text PRIMARY KEY,
  title        text NOT NULL,
  description  text NOT NULL,
  icon         text NOT NULL,
  rule         jsonb NOT NULL,
  xp_reward    integer NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  is_hidden    boolean NOT NULL DEFAULT false,
  sort         integer NOT NULL DEFAULT 0,
  status       content_status NOT NULL DEFAULT 'published'
);

CREATE TABLE user_achievements (
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id  text NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

-- Append-only XP ledger. The unique key makes every award idempotent.
CREATE TABLE xp_events (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      integer NOT NULL,
  source      text NOT NULL CHECK (source IN ('challenge', 'achievement', 'collection', 'daily', 'weekly', 'monthly', 'admin')),
  source_id   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source, source_id)
);
CREATE INDEX xp_events_user_time_idx ON xp_events(user_id, created_at DESC);
