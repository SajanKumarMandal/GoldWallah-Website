CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS private_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES gold_listings(id) ON DELETE CASCADE,
  jeweller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bid_amount NUMERIC(14,2) NOT NULL,
  message TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT private_bids_amount_check CHECK (bid_amount > 0),
  CONSTRAINT private_bids_status_check CHECK (
    status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')
  ),
  CONSTRAINT private_bids_message_length_check CHECK (
    message IS NULL OR char_length(message) <= 1000
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gold_listings_accepted_bid_id_fkey'
      AND conrelid = 'gold_listings'::regclass
  ) THEN
    ALTER TABLE gold_listings
      ADD CONSTRAINT gold_listings_accepted_bid_id_fkey
      FOREIGN KEY (accepted_bid_id) REFERENCES private_bids(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_private_bid_per_jeweller_listing
  ON private_bids(listing_id, jeweller_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_private_bids_listing_id
  ON private_bids(listing_id);

CREATE INDEX IF NOT EXISTS idx_private_bids_jeweller_id
  ON private_bids(jeweller_id);

CREATE INDEX IF NOT EXISTS idx_private_bids_status
  ON private_bids(status);

CREATE INDEX IF NOT EXISTS idx_private_bids_listing_status_created_at
  ON private_bids(listing_id, status, created_at DESC);

DROP TRIGGER IF EXISTS trg_private_bids_updated_at ON private_bids;
CREATE TRIGGER trg_private_bids_updated_at
BEFORE UPDATE ON private_bids
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
