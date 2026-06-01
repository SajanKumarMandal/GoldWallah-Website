CREATE EXTENSION IF NOT EXISTS postgis;

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

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_location geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN profile_latitude IS NULL OR profile_longitude IS NULL THEN NULL
      ELSE ST_SetSRID(
        ST_MakePoint(profile_longitude::double precision, profile_latitude::double precision),
        4326
      )::geography
    END
  ) STORED;

ALTER TABLE gold_listings
  ADD COLUMN IF NOT EXISTS listing_location geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN latitude IS NULL OR longitude IS NULL THEN NULL
      ELSE ST_SetSRID(
        ST_MakePoint(longitude::double precision, latitude::double precision),
        4326
      )::geography
    END
  ) STORED;

ALTER TABLE jeweller_business_verifications
  ADD COLUMN IF NOT EXISTS shop_location geography(Point, 4326)
  GENERATED ALWAYS AS (
    CASE
      WHEN latitude IS NULL OR longitude IS NULL THEN NULL
      ELSE ST_SetSRID(
        ST_MakePoint(longitude::double precision, latitude::double precision),
        4326
      )::geography
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_users_account_status
  ON users(account_status);

CREATE INDEX IF NOT EXISTS idx_users_role_account_status
  ON users(role, account_status);

CREATE INDEX IF NOT EXISTS idx_users_profile_location_gist
  ON users USING GIST(profile_location);

CREATE INDEX IF NOT EXISTS idx_gold_listings_listing_location_gist
  ON gold_listings USING GIST(listing_location);

CREATE INDEX IF NOT EXISTS idx_gold_listings_status_seller_created
  ON gold_listings(status, seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jeweller_business_verifications_shop_location_gist
  ON jeweller_business_verifications USING GIST(shop_location);

CREATE INDEX IF NOT EXISTS idx_jeweller_business_verifications_status_jeweller_reviewed
  ON jeweller_business_verifications(status, jeweller_id, reviewed_at DESC NULLS LAST, created_at DESC);
