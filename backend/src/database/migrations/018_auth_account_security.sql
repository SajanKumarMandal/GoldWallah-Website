CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_password_reset_tokens_token_hash
  ON password_reset_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_created
  ON password_reset_tokens(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_active
  ON password_reset_tokens(token_hash, expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_email_verification_tokens_token_hash
  ON email_verification_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_created
  ON email_verification_tokens(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_active
  ON email_verification_tokens(token_hash, expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_login_attempts (
  id UUID PRIMARY KEY,
  identity_hash TEXT NOT NULL,
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('EMAIL', 'IP')),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  failed_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope, identity_hash)
);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_locked_until
  ON auth_login_attempts(locked_until)
  WHERE locked_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_user_id
  ON auth_login_attempts(user_id);

CREATE TABLE IF NOT EXISTS auth_audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  ip_hash TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_created
  ON auth_audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_created
  ON auth_audit_logs(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_mfa_recovery_codes (
  id UUID PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (admin_user_id, code_hash)
);

CREATE INDEX IF NOT EXISTS idx_admin_mfa_recovery_codes_admin_user_id
  ON admin_mfa_recovery_codes(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_admin_mfa_recovery_codes_active
  ON admin_mfa_recovery_codes(admin_user_id, code_hash)
  WHERE consumed_at IS NULL;

ALTER TABLE otp_codes
  DROP CONSTRAINT IF EXISTS otp_codes_purpose_check;

ALTER TABLE otp_codes
  ADD CONSTRAINT otp_codes_purpose_check CHECK (
    purpose IN ('LOGIN', 'REGISTER', 'PHONE_VERIFY')
  );
