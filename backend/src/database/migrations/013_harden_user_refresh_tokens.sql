CREATE UNIQUE INDEX IF NOT EXISTS unique_refresh_tokens_token_hash
  ON refresh_tokens(token_hash);

COMMENT ON INDEX unique_refresh_tokens_token_hash IS
  'Prevents duplicate user refresh token hashes so refresh rotation and reuse detection are deterministic.';
