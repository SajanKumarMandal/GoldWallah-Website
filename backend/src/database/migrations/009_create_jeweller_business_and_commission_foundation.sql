CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS business_verification_status VARCHAR(30) NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN IF NOT EXISTS commission_lock_status VARCHAR(30) NOT NULL DEFAULT 'CLEAR',
  ADD COLUMN IF NOT EXISTS commission_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commission_lock_reason TEXT;

ALTER TABLE users
  ALTER COLUMN business_verification_status SET DEFAULT 'NOT_SUBMITTED',
  ALTER COLUMN commission_lock_status SET DEFAULT 'CLEAR';

UPDATE users
SET
  business_verification_status = COALESCE(business_verification_status, 'NOT_SUBMITTED'),
  commission_lock_status = COALESCE(commission_lock_status, 'CLEAR')
WHERE business_verification_status IS NULL
   OR commission_lock_status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_business_verification_status_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_business_verification_status_check CHECK (
        business_verification_status IN (
          'NOT_SUBMITTED',
          'PENDING',
          'APPROVED',
          'REJECTED'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_commission_lock_status_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_commission_lock_status_check CHECK (
        commission_lock_status IN ('CLEAR', 'LOCKED')
      );
  END IF;
END;
$$;

COMMENT ON COLUMN users.commission_lock_status IS
  'Locks jeweller transactional actions when commission is unpaid.';

CREATE TABLE IF NOT EXISTS jeweller_business_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jeweller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shop_name VARCHAR(160) NOT NULL,
  owner_name VARCHAR(160) NOT NULL,
  business_mobile VARCHAR(20) NOT NULL,
  business_email VARCHAR(255),
  gst_number_encrypted TEXT,
  gst_number_hash TEXT,
  gst_last4 VARCHAR(4),
  shop_license_number_encrypted TEXT,
  shop_license_number_hash TEXT,
  shop_license_last4 VARCHAR(4),
  business_address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(20) NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  shop_opening_time TIME,
  shop_closing_time TIME,
  years_in_business INTEGER,
  business_type VARCHAR(40),
  shop_front_image_url TEXT NOT NULL,
  gst_certificate_image_url TEXT,
  shop_license_image_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  review_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jeweller_business_verifications_status_check CHECK (
    status IN ('PENDING', 'APPROVED', 'REJECTED')
  ),
  CONSTRAINT jeweller_business_verifications_business_type_check CHECK (
    business_type IS NULL
    OR business_type IN (
      'INDIVIDUAL_JEWELLER',
      'JEWELLERY_SHOP',
      'GOLD_DEALER',
      'PAWNBROKER',
      'OTHER'
    )
  ),
  CONSTRAINT jeweller_business_verifications_mobile_check CHECK (
    business_mobile ~ '^[0-9]{10,15}$'
  ),
  CONSTRAINT jeweller_business_verifications_pincode_check CHECK (
    char_length(pincode) BETWEEN 4 AND 20
  ),
  CONSTRAINT jeweller_business_verifications_years_check CHECK (
    years_in_business IS NULL
    OR years_in_business BETWEEN 0 AND 150
  ),
  CONSTRAINT jeweller_business_verifications_latitude_check CHECK (
    latitude IS NULL OR latitude BETWEEN -90 AND 90
  ),
  CONSTRAINT jeweller_business_verifications_longitude_check CHECK (
    longitude IS NULL OR longitude BETWEEN -180 AND 180
  ),
  CONSTRAINT jeweller_business_verifications_identity_check CHECK (
    gst_number_hash IS NOT NULL
    OR shop_license_number_hash IS NOT NULL
  )
);

COMMENT ON TABLE jeweller_business_verifications IS
  'Stores jeweller business verification submissions and shop location for future nearby seller discovery.';

CREATE TABLE IF NOT EXISTS platform_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID,
  jeweller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
  gross_deal_amount NUMERIC(14,2) NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0200,
  commission_amount NUMERIC(14,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  razorpay_signature TEXT,
  payment_attempt_count INTEGER NOT NULL DEFAULT 0,
  last_payment_attempt_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  waived_by UUID REFERENCES users(id) ON DELETE SET NULL,
  waived_at TIMESTAMPTZ,
  waiver_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_commissions_status_check CHECK (
    status IN (
      'PENDING',
      'PAYMENT_INITIATED',
      'PAID',
      'FAILED',
      'WAIVED',
      'DISPUTED'
    )
  ),
  CONSTRAINT platform_commissions_gross_deal_amount_check CHECK (
    gross_deal_amount > 0
  ),
  CONSTRAINT platform_commissions_rate_check CHECK (
    commission_rate > 0 AND commission_rate <= 1
  ),
  CONSTRAINT platform_commissions_amount_check CHECK (
    commission_amount > 0
  ),
  CONSTRAINT platform_commissions_attempt_count_check CHECK (
    payment_attempt_count >= 0
  ),
  CONSTRAINT platform_commissions_paid_status_check CHECK (
    status <> 'PAID' OR paid_at IS NOT NULL
  ),
  CONSTRAINT platform_commissions_waived_status_check CHECK (
    status <> 'WAIVED'
    OR (waived_by IS NOT NULL AND waived_at IS NOT NULL)
  )
);

COMMENT ON TABLE platform_commissions IS
  'Tracks GoldWallah 2% platform commission dues after completed deals.';
COMMENT ON COLUMN platform_commissions.deal_id IS
  'Future FK to deals(id) after deal module exists.';

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_logs IS
  'Generic audit log for sensitive admin, verification, commission, and payment events.';

CREATE INDEX IF NOT EXISTS idx_users_role
  ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_business_verification_status
  ON users(business_verification_status);

CREATE INDEX IF NOT EXISTS idx_users_commission_lock_status
  ON users(commission_lock_status);

CREATE INDEX IF NOT EXISTS idx_users_role_business_verification_status
  ON users(role, business_verification_status);

CREATE INDEX IF NOT EXISTS idx_users_role_commission_lock_status
  ON users(role, commission_lock_status);

CREATE INDEX IF NOT EXISTS idx_jeweller_business_verifications_jeweller_id
  ON jeweller_business_verifications(jeweller_id);

CREATE INDEX IF NOT EXISTS idx_jeweller_business_verifications_status
  ON jeweller_business_verifications(status);

CREATE INDEX IF NOT EXISTS idx_jeweller_business_verifications_created_at_desc
  ON jeweller_business_verifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jeweller_business_verifications_status_created_at_desc
  ON jeweller_business_verifications(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jeweller_business_verifications_city_state
  ON jeweller_business_verifications(city, state);

CREATE INDEX IF NOT EXISTS idx_jeweller_business_verifications_latitude_longitude
  ON jeweller_business_verifications(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_jeweller_business_verifications_business_type
  ON jeweller_business_verifications(business_type);

CREATE INDEX IF NOT EXISTS idx_jeweller_business_verifications_gst_hash
  ON jeweller_business_verifications(gst_number_hash);

CREATE INDEX IF NOT EXISTS idx_jeweller_business_verifications_license_hash
  ON jeweller_business_verifications(shop_license_number_hash);

CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_jeweller_business_verification_per_user
  ON jeweller_business_verifications(jeweller_id)
  WHERE status = 'PENDING';

CREATE UNIQUE INDEX IF NOT EXISTS unique_approved_jeweller_gst_hash
  ON jeweller_business_verifications(gst_number_hash)
  WHERE status = 'APPROVED' AND gst_number_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_approved_jeweller_license_hash
  ON jeweller_business_verifications(shop_license_number_hash)
  WHERE status = 'APPROVED' AND shop_license_number_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_commissions_jeweller_id
  ON platform_commissions(jeweller_id);

CREATE INDEX IF NOT EXISTS idx_platform_commissions_seller_id
  ON platform_commissions(seller_id);

CREATE INDEX IF NOT EXISTS idx_platform_commissions_status
  ON platform_commissions(status);

CREATE INDEX IF NOT EXISTS idx_platform_commissions_created_at_desc
  ON platform_commissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_commissions_jeweller_id_status
  ON platform_commissions(jeweller_id, status);

CREATE INDEX IF NOT EXISTS idx_platform_commissions_jeweller_status_created_at_desc
  ON platform_commissions(jeweller_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS unique_platform_commissions_razorpay_order_id
  ON platform_commissions(razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_platform_commissions_razorpay_payment_id
  ON platform_commissions(razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id
  ON audit_logs(actor_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_entity_id
  ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc
  ON audit_logs(created_at DESC);

DROP TRIGGER IF EXISTS trg_jeweller_business_verifications_updated_at
  ON jeweller_business_verifications;
CREATE TRIGGER trg_jeweller_business_verifications_updated_at
BEFORE UPDATE ON jeweller_business_verifications
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_platform_commissions_updated_at
  ON platform_commissions;
CREATE TRIGGER trg_platform_commissions_updated_at
BEFORE UPDATE ON platform_commissions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
