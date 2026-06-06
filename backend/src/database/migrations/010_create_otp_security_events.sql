CREATE TABLE IF NOT EXISTS otp_security_events (
  id UUID PRIMARY KEY,
  phone VARCHAR(20),
  purpose VARCHAR(30),
  event_type VARCHAR(40) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  error_code VARCHAR(80),
  provider VARCHAR(40),
  provider_message_id VARCHAR(120),
  ip_address VARCHAR(80),
  user_agent TEXT,
  request_id VARCHAR(120),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_security_events_phone_created_at
  ON otp_security_events(phone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_security_events_event_type_created_at
  ON otp_security_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_codes_cleanup_expired
  ON otp_codes(expires_at)
  WHERE consumed_at IS NOT NULL OR delivery_status IN ('FAILED', 'CONSUMED');
