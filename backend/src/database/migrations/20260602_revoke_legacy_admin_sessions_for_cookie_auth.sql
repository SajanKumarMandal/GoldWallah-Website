-- Admin refresh tokens were previously returned to browser JavaScript.
-- Force admins to re-authenticate into the HttpOnly cookie refresh-token flow.
UPDATE admin_sessions
SET revoked_at = COALESCE(revoked_at, now())
WHERE revoked_at IS NULL;
