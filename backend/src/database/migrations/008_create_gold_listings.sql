CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS gold_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  gold_type VARCHAR(30) NOT NULL,
  purity VARCHAR(20) NOT NULL,
  weight_grams NUMERIC(10,2) NOT NULL,
  expected_price NUMERIC(12,2),
  description TEXT,
  condition VARCHAR(30),
  hallmark_available BOOLEAN NOT NULL DEFAULT false,
  bill_available BOOLEAN NOT NULL DEFAULT false,
  purchase_year INTEGER,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  accepted_bid_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT gold_listings_gold_type_check CHECK (
    gold_type IN ('JEWELLERY', 'COIN', 'BAR', 'SCRAP', 'OTHER')
  ),
  CONSTRAINT gold_listings_purity_check CHECK (
    purity IN ('24K', '22K', '18K', '14K', 'UNKNOWN')
  ),
  CONSTRAINT gold_listings_condition_check CHECK (
    condition IS NULL OR condition IN ('NEW', 'USED', 'DAMAGED', 'OLD', 'UNKNOWN')
  ),
  CONSTRAINT gold_listings_status_check CHECK (
    status IN ('ACTIVE', 'BID_ACCEPTED', 'SOLD', 'CANCELLED')
  ),
  CONSTRAINT gold_listings_weight_grams_check CHECK (weight_grams > 0),
  CONSTRAINT gold_listings_expected_price_check CHECK (
    expected_price IS NULL OR expected_price > 0
  ),
  CONSTRAINT gold_listings_purchase_year_check CHECK (
    purchase_year IS NULL
    OR purchase_year BETWEEN 1900 AND EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
  ),
  CONSTRAINT gold_listings_latitude_check CHECK (
    latitude IS NULL OR latitude BETWEEN -90 AND 90
  ),
  CONSTRAINT gold_listings_longitude_check CHECK (
    longitude IS NULL OR longitude BETWEEN -180 AND 180
  )
);

COMMENT ON TABLE gold_listings IS 'Stores seller-created gold sale listings.';
COMMENT ON COLUMN gold_listings.accepted_bid_id IS
  'Future reference to accepted bid after bids module is created.';

CREATE TABLE IF NOT EXISTS listing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES gold_listings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT listing_images_sort_order_check CHECK (sort_order >= 0),
  CONSTRAINT listing_images_listing_id_sort_order_unique UNIQUE (
    listing_id,
    sort_order
  )
);

COMMENT ON TABLE listing_images IS 'Stores ordered image URLs for gold listings.';

CREATE INDEX IF NOT EXISTS idx_gold_listings_seller_id
  ON gold_listings(seller_id);

CREATE INDEX IF NOT EXISTS idx_gold_listings_status
  ON gold_listings(status);

CREATE INDEX IF NOT EXISTS idx_gold_listings_created_at_desc
  ON gold_listings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gold_listings_seller_id_created_at_desc
  ON gold_listings(seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gold_listings_status_created_at_desc
  ON gold_listings(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gold_listings_city_state
  ON gold_listings(city, state);

CREATE INDEX IF NOT EXISTS idx_gold_listings_latitude_longitude
  ON gold_listings(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_gold_listings_gold_type
  ON gold_listings(gold_type);

CREATE INDEX IF NOT EXISTS idx_gold_listings_purity
  ON gold_listings(purity);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id
  ON listing_images(listing_id);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id_sort_order
  ON listing_images(listing_id, sort_order);

DROP TRIGGER IF EXISTS trg_gold_listings_updated_at ON gold_listings;
CREATE TRIGGER trg_gold_listings_updated_at
BEFORE UPDATE ON gold_listings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
