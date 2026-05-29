ALTER TABLE kyc_submissions
  ADD COLUMN IF NOT EXISTS address_as_per_aadhaar TEXT,
  ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS aadhaar_last4 VARCHAR(4),
  ADD COLUMN IF NOT EXISTS pan_last4 VARCHAR(4),
  ADD COLUMN IF NOT EXISTS selfie_image_url TEXT;

UPDATE kyc_submissions
SET
  mobile_number = COALESCE(mobile_number, '0000000000'),
  address_as_per_aadhaar = COALESCE(address_as_per_aadhaar, address_line, 'Legacy KYC address'),
  aadhaar_number_hash = COALESCE(aadhaar_number_hash, 'legacy-aadhaar-' || md5(id::text)),
  aadhaar_last4 = COALESCE(aadhaar_last4, '0000'),
  pan_number_hash = COALESCE(pan_number_hash, 'legacy-pan-' || md5(id::text)),
  pan_last4 = COALESCE(pan_last4, '0000'),
  selfie_image_url = COALESCE(selfie_image_url, selfie_url, '/uploads/kyc/legacy-selfie-unavailable.jpg')
WHERE
  mobile_number IS NULL
  OR address_as_per_aadhaar IS NULL
  OR aadhaar_number_hash IS NULL
  OR aadhaar_last4 IS NULL
  OR pan_number_hash IS NULL
  OR pan_last4 IS NULL
  OR selfie_image_url IS NULL;

ALTER TABLE kyc_submissions
  ALTER COLUMN full_name SET NOT NULL,
  ALTER COLUMN mobile_number SET NOT NULL,
  ALTER COLUMN address_as_per_aadhaar SET NOT NULL,
  ALTER COLUMN aadhaar_number_hash SET NOT NULL,
  ALTER COLUMN aadhaar_last4 SET NOT NULL,
  ALTER COLUMN pan_number_hash SET NOT NULL,
  ALTER COLUMN pan_last4 SET NOT NULL,
  ALTER COLUMN selfie_image_url SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_created_at_desc
  ON kyc_submissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status_created_at_desc
  ON kyc_submissions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user_id_created_at_desc
  ON kyc_submissions(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_kyc_per_user
  ON kyc_submissions(user_id)
  WHERE status = 'PENDING';
