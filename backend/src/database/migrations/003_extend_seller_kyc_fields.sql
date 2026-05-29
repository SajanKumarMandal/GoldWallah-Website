ALTER TABLE kyc_submissions
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
  ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address_line TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(20),
  ADD COLUMN IF NOT EXISTS aadhaar_last4 VARCHAR(4),
  ADD COLUMN IF NOT EXISTS pan_last4 VARCHAR(4),
  ADD COLUMN IF NOT EXISTS selfie_image_url TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_front_image_url TEXT,
  ADD COLUMN IF NOT EXISTS aadhaar_back_image_url TEXT,
  ADD COLUMN IF NOT EXISTS pan_card_image_url TEXT;

ALTER TABLE kyc_submissions DROP CONSTRAINT IF EXISTS kyc_submissions_gender_check;
ALTER TABLE kyc_submissions
  ADD CONSTRAINT kyc_submissions_gender_check CHECK (
    gender IS NULL OR gender IN ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')
  );

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_mobile_number
  ON kyc_submissions(mobile_number);
