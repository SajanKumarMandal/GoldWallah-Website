ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE users
  ALTER COLUMN account_status SET DEFAULT 'ACTIVE';

UPDATE users
SET account_status = COALESCE(account_status, 'ACTIVE')
WHERE account_status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_account_status_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_account_status_check CHECK (
        account_status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_users_account_status
  ON users(account_status);

CREATE INDEX IF NOT EXISTS idx_users_role_account_status
  ON users(role, account_status);

CREATE INDEX IF NOT EXISTS idx_users_role_status_profile_location
  ON users(role, account_status, profile_latitude, profile_longitude)
  WHERE profile_latitude IS NOT NULL
    AND profile_longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gold_listings_status_seller_created
  ON gold_listings(status, seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gold_listings_status_location
  ON gold_listings(status, latitude, longitude)
  WHERE latitude IS NOT NULL
    AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gold_listings_status_lower_state_city
  ON gold_listings(status, lower(state), lower(city));

CREATE INDEX IF NOT EXISTS idx_jeweller_business_verifications_status_jeweller_reviewed
  ON jeweller_business_verifications(status, jeweller_id, reviewed_at DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jbv_status_location
  ON jeweller_business_verifications(status, latitude, longitude)
  WHERE latitude IS NOT NULL
    AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jbv_status_lower_state_city
  ON jeweller_business_verifications(status, lower(state), lower(city));
