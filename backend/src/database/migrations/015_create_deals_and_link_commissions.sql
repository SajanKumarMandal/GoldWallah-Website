CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES gold_listings(id) ON DELETE RESTRICT,
  accepted_bid_id UUID NOT NULL REFERENCES private_bids(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  jeweller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  final_amount NUMERIC(14,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'COMMISSION_PENDING',
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT deals_final_amount_check CHECK (final_amount > 0),
  CONSTRAINT deals_status_check CHECK (
    status IN (
      'COMMISSION_PENDING',
      'READY_TO_SETTLE',
      'COMPLETED',
      'CANCELLED'
    )
  ),
  CONSTRAINT deals_completed_status_check CHECK (
    status <> 'COMPLETED' OR completed_at IS NOT NULL
  ),
  CONSTRAINT deals_cancelled_status_check CHECK (
    status <> 'CANCELLED' OR cancelled_at IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_deals_listing_id
  ON deals(listing_id);

CREATE UNIQUE INDEX IF NOT EXISTS unique_deals_accepted_bid_id
  ON deals(accepted_bid_id);

CREATE INDEX IF NOT EXISTS idx_deals_seller_id
  ON deals(seller_id);

CREATE INDEX IF NOT EXISTS idx_deals_jeweller_id
  ON deals(jeweller_id);

CREATE INDEX IF NOT EXISTS idx_deals_status
  ON deals(status);

CREATE INDEX IF NOT EXISTS idx_deals_created_at_desc
  ON deals(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'platform_commissions_deal_id_fkey'
      AND conrelid = 'platform_commissions'::regclass
  ) THEN
    ALTER TABLE platform_commissions
      ADD CONSTRAINT platform_commissions_deal_id_fkey
      FOREIGN KEY (deal_id) REFERENCES deals(id)
      ON DELETE RESTRICT;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS unique_platform_commissions_deal_id
  ON platform_commissions(deal_id)
  WHERE deal_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_deals_updated_at ON deals;
CREATE TRIGGER trg_deals_updated_at
BEFORE UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
