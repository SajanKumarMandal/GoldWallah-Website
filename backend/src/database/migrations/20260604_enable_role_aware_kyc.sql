ALTER TABLE users
  ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(30) NOT NULL DEFAULT 'NOT_SUBMITTED';

ALTER TABLE users
  ALTER COLUMN kyc_status SET DEFAULT 'NOT_SUBMITTED';

WITH latest_kyc AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    status
  FROM kyc_submissions
  ORDER BY user_id, created_at DESC
)
UPDATE users
SET kyc_status = CASE
  WHEN latest_kyc.status IS NOT NULL THEN latest_kyc.status
  ELSE 'NOT_SUBMITTED'
END
FROM latest_kyc
WHERE users.id = latest_kyc.user_id
  AND users.role IN ('SELLER', 'JEWELLER');

UPDATE users
SET kyc_status = 'NOT_SUBMITTED'
WHERE role IN ('SELLER', 'JEWELLER')
  AND NOT EXISTS (
    SELECT 1
    FROM kyc_submissions
    WHERE kyc_submissions.user_id = users.id
  );

UPDATE users
SET kyc_status = 'NOT_SUBMITTED'
WHERE role IN ('SELLER', 'JEWELLER')
  AND kyc_status NOT IN (
    'NOT_SUBMITTED',
    'PENDING',
    'APPROVED',
    'REJECTED'
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_kyc_status_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_kyc_status_check CHECK (
        kyc_status IN (
          'NOT_SUBMITTED',
          'PENDING',
          'APPROVED',
          'REJECTED'
        )
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_users_role_kyc_status
  ON users(role, kyc_status);

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user_status_created_at
  ON kyc_submissions(user_id, status, created_at DESC);

COMMENT ON COLUMN users.kyc_status IS
  'Current role-aware KYC state. New users start as NOT_SUBMITTED until a seller or jeweller KYC submission is created.';
