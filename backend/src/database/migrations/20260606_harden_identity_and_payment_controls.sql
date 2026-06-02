CREATE UNIQUE INDEX IF NOT EXISTS unique_approved_kyc_aadhaar_hash
  ON kyc_submissions(aadhaar_number_hash)
  WHERE status = 'APPROVED' AND aadhaar_number_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS unique_approved_kyc_pan_hash
  ON kyc_submissions(pan_number_hash)
  WHERE status = 'APPROVED' AND pan_number_hash IS NOT NULL;

ALTER TABLE platform_commissions
  DROP CONSTRAINT IF EXISTS platform_commissions_paid_status_check;

ALTER TABLE platform_commissions
  ADD CONSTRAINT platform_commissions_paid_status_check CHECK (
    status <> 'PAID'
    OR (
      paid_at IS NOT NULL
      AND (
        razorpay_payment_id IS NOT NULL
        OR payment_reference IS NOT NULL
      )
    )
  );
