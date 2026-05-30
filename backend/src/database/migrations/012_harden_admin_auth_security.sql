ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS unique_admin_sessions_refresh_token_hash
  ON admin_sessions(refresh_token_hash);

COMMENT ON COLUMN admin_users.must_change_password IS
  'Forces sub-admins with temporary passwords to change password before privileged admin actions.';

COMMENT ON INDEX unique_admin_sessions_refresh_token_hash IS
  'Prevents duplicate opaque refresh token hashes. Rollback requires dropping this index before downgrading admin auth.';
