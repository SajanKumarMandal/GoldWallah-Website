ALTER TABLE kyc_submissions
  ADD COLUMN IF NOT EXISTS selfie_captured_at TIMESTAMPTZ;

UPDATE kyc_submissions
SET selfie_captured_at = COALESCE(selfie_captured_at, created_at)
WHERE selfie_captured_at IS NULL;

ALTER TABLE kyc_submissions
  ALTER COLUMN selfie_captured_at SET NOT NULL;
