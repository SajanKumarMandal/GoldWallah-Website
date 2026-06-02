ALTER TABLE platform_commissions
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_note TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS unique_platform_commissions_payment_reference
  ON platform_commissions(payment_reference)
  WHERE payment_reference IS NOT NULL;
