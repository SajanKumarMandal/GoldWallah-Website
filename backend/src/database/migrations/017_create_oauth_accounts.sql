CREATE TABLE IF NOT EXISTS user_oauth_accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('GOOGLE', 'FACEBOOK')),
  provider_subject VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_user_oauth_accounts_user_id
  ON user_oauth_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_user_oauth_accounts_email
  ON user_oauth_accounts(email);

COMMENT ON TABLE user_oauth_accounts IS
  'Links verified external OAuth identities to GoldWallah users without trusting frontend-provided profile data.';
