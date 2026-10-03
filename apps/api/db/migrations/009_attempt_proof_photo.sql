-- Optional photo taken at the location when completing a challenge (shown to moderators, reusable when sharing).
ALTER TABLE challenge_attempts ADD COLUMN proof_photo_id uuid REFERENCES photos(id) ON DELETE SET NULL;
