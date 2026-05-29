ALTER TABLE kyc_submissions
  ADD COLUMN IF NOT EXISTS aadhaar_number_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS pan_number_encrypted TEXT;
