-- Language for server-sent text (push notifications); the app keeps it in sync with its own setting.
ALTER TABLE users ADD COLUMN language text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'lv', 'ru'));

-- Friend activity pushes are throttled through the same log as progress reminders.
ALTER TABLE push_reminders DROP CONSTRAINT push_reminders_kind_check;
ALTER TABLE push_reminders ADD CONSTRAINT push_reminders_kind_check
  CHECK (kind IN ('streak', 'goal_ending', 'level_close', 'friend_activity'));
