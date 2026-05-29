ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('SELLER', 'JEWELLER', 'ADMIN'));

CREATE TABLE IF NOT EXISTS kyc_submissions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  aadhaar_number_hash TEXT,
  pan_number_hash TEXT,
  aadhaar_front_url TEXT,
  aadhaar_back_url TEXT,
  pan_card_url TEXT,
  selfie_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kyc_submissions_status_check CHECK (
    status IN ('PENDING', 'APPROVED', 'REJECTED')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_submissions_one_pending_per_user
  ON kyc_submissions(user_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user_id
  ON kyc_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status
  ON kyc_submissions(status);

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user_created_at
  ON kyc_submissions(user_id, created_at DESC);
