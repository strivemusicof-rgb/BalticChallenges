/**
 * Grants a role to an existing account, e.g. to create the first admin:
 *   node dist/scripts/set-role.js you@example.com admin
 */
import { createPool } from '../db.js';

const [email, role] = process.argv.slice(2);
if (!email || !role || !['user', 'moderator', 'admin'].includes(role)) {
  console.error('usage: set-role <email> <user|moderator|admin>');
  process.exit(2);
}

const db = createPool(process.env.DATABASE_URL ?? '');
try {
  const { rows } = await db.query<{ id: string }>(
    'UPDATE users SET role = $2::user_role WHERE email = $1 RETURNING id',
    [email, role],
  );
  if (!rows[0]) {
    console.error(`no account with email ${email}`);
    process.exitCode = 1;
  } else {
    // Existing sessions carry the old role in their access token; force a fresh sign-in.
    await db.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [rows[0].id]);
    await db.query(
      `INSERT INTO admin_audit_log (actor_id, action, target_type, target_id, details)
       VALUES (NULL, 'set_role_cli', 'user', $1, $2)`,
      [rows[0].id, JSON.stringify({ role })],
    );
    console.log(`${email} is now ${role}`);
  }
} finally {
  await db.end();
}
