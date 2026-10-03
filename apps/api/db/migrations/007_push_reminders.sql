-- One row per reminder sent, so each reminder fires at most once and progress pushes can be capped per day.
CREATE TABLE push_reminders (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind     text NOT NULL CHECK (kind IN ('streak', 'goal_ending', 'level_close')),
  key      text NOT NULL,
  sent_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, key)
);
CREATE INDEX push_reminders_sent_idx ON push_reminders(user_id, sent_at DESC);
