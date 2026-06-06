ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) NOT NULL DEFAULT 'SENT',
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(255);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'otp_codes_delivery_status_check'
  ) THEN
    ALTER TABLE otp_codes
      ADD CONSTRAINT otp_codes_delivery_status_check
      CHECK (delivery_status IN ('PENDING', 'SENT', 'FAILED', 'CONSUMED'));
  END IF;
END $$;

UPDATE otp_codes
SET delivery_status = CASE
  WHEN consumed_at IS NOT NULL THEN 'CONSUMED'
  ELSE delivery_status
END;

UPDATE otp_codes
SET sent_at = COALESCE(sent_at, created_at)
WHERE delivery_status = 'SENT'
  AND sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_otp_codes_active_delivery
  ON otp_codes(phone, purpose, delivery_status, created_at DESC)
  WHERE consumed_at IS NULL;
