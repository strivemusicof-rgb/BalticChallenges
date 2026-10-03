-- Phase 2: streaks, daily bonus, weekly/monthly goals, push tokens.

CREATE TABLE user_streaks (
  user_id          uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak   integer NOT NULL DEFAULT 0,
  longest_streak   integer NOT NULL DEFAULT 0,
  -- Calendar day in Europe/Riga of the last completion.
  last_active_day  date
);

-- Recurring goals. Progress is computed from completions inside the current period window,
-- so a goal never needs to be re-created every week.
CREATE TABLE goals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  title        text NOT NULL,
  description  text NOT NULL,
  icon         text NOT NULL,
  period       text NOT NULL CHECK (period IN ('weekly', 'monthly')),
  -- {"type":"challenges_completed"} | {"type":"new_places"} | {"type":"category_completed","category":"history"}
  -- | {"type":"regions_visited"} | {"type":"countries_visited"} | {"type":"xp_earned"}
  metric       jsonb NOT NULL,
  target       integer NOT NULL CHECK (target > 0),
  xp_reward    integer NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  achievement_id text REFERENCES achievements(id) ON DELETE SET NULL,
  status       content_status NOT NULL DEFAULT 'published',
  sort         integer NOT NULL DEFAULT 0
);

CREATE TABLE user_goal_completions (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id     uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  -- e.g. "2026-W40" or "2026-10".
  period_key  text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, goal_id, period_key)
);

CREATE TABLE push_tokens (
  token       text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform    text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_tokens_user_idx ON push_tokens(user_id);

ALTER TABLE users
  ADD COLUMN notify_progress boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_social boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_new_challenges boolean NOT NULL DEFAULT true,
  ADD COLUMN hide_home_area boolean NOT NULL DEFAULT false;

ALTER TABLE xp_events DROP CONSTRAINT xp_events_source_check;
ALTER TABLE xp_events ADD CONSTRAINT xp_events_source_check
  CHECK (source IN ('challenge', 'achievement', 'collection', 'daily', 'weekly', 'monthly', 'goal', 'streak', 'admin'));

INSERT INTO achievements (id, title, description, icon, rule, xp_reward, sort) VALUES
  ('streak-7',     '7-Day Streak',     'Complete a challenge 7 days in a row.',  '🔥', '{"type":"streak_days","count":7}',  300, 300),
  ('streak-30',    '30-Day Streak',    'Complete a challenge 30 days in a row.', '☄️', '{"type":"streak_days","count":30}', 1500, 310),
  ('early-bird',   'Early Bird',       'Complete a challenge between 4:00 and 8:00.',  '🌅', '{"type":"completed_in_hours","from":4,"to":8,"count":1}',  150, 150),
  ('night-explorer','Night Explorer',  'Complete a challenge between 21:00 and 3:00.', '🌙', '{"type":"completed_in_hours","from":21,"to":3,"count":1}', 150, 160),
  ('weekly-warrior','Weekly Warrior',  'Finish 4 weekly goals.',  '🗓️', '{"type":"goals_completed","period":"weekly","count":4}', 400, 320),
  ('lighthouse-keeper','Lighthouse Keeper','Visit 3 lighthouses.', '🗼', '{"type":"category_completed","category":"lighthouses","count":3}', 200, 125),
  ('nature-lover', 'Nature Lover',     'Complete 10 nature challenges.', '🌲', '{"type":"category_completed","category":"nature","count":10}', 300, 126);

INSERT INTO goals (slug, title, description, icon, period, metric, target, xp_reward, sort) VALUES
  ('weekly-new-places',  'Visit 3 new places',          'Complete challenges at 3 different places this week.', '📍', 'weekly',  '{"type":"new_places"}', 3, 500, 10),
  ('weekly-history',     'Two historic sites',          'Complete 2 history challenges this week.',             '🏰', 'weekly',  '{"type":"category_completed","category":"history"}', 2, 300, 20),
  ('monthly-explorer',   'Baltic Explorer of the month','Complete 10 challenges this month.',                   '🏆', 'monthly', '{"type":"challenges_completed"}', 10, 2000, 30),
  ('monthly-regions',    'Three regions',               'Complete challenges in 3 different regions this month.','🧭', 'monthly', '{"type":"regions_visited"}', 3, 750, 40);
