-- Reports outlive their reporter, but once the reported content itself is gone there is nothing left to moderate.
CREATE FUNCTION dismiss_reports_for_deleted_target() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE reports
  SET status = 'dismissed', resolved_at = now(), resolution_note = 'Target deleted'
  WHERE status = 'open' AND target_type = TG_ARGV[0] AND target_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER posts_dismiss_reports AFTER DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION dismiss_reports_for_deleted_target('post');
CREATE TRIGGER comments_dismiss_reports AFTER DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION dismiss_reports_for_deleted_target('comment');
CREATE TRIGGER users_dismiss_reports AFTER DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION dismiss_reports_for_deleted_target('user');
