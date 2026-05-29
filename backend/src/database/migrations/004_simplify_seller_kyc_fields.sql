ALTER TABLE kyc_submissions
  ADD COLUMN IF NOT EXISTS address_as_per_aadhaar TEXT;
