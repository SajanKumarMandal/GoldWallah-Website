-- Admin review and finance actor columns store admin_users.id values.
-- Older schema versions pointed these columns at users(id), so align the
-- database constraints with the current separated admin identity model.

WITH legacy_actor_ids AS (
  SELECT reviewed_by AS id
  FROM kyc_submissions
  WHERE reviewed_by IS NOT NULL
  UNION
  SELECT reviewed_by AS id
  FROM jeweller_business_verifications
  WHERE reviewed_by IS NOT NULL
  UNION
  SELECT waived_by AS id
  FROM platform_commissions
  WHERE waived_by IS NOT NULL
)
INSERT INTO admin_users (
  id,
  name,
  email,
  password_hash,
  status,
  is_super_admin,
  must_change_password,
  password_changed_at
)
SELECT
  legacy_actor_ids.id,
  COALESCE(NULLIF(users.full_name, ''), 'Legacy admin actor'),
  'legacy-admin-' || replace(legacy_actor_ids.id::text, '-', '') || '@goldwallah.invalid',
  'disabled-migrated-admin-actor',
  'SUSPENDED',
  false,
  true,
  now()
FROM legacy_actor_ids
LEFT JOIN users ON users.id = legacy_actor_ids.id
WHERE NOT EXISTS (
  SELECT 1
  FROM admin_users
  WHERE admin_users.id = legacy_actor_ids.id
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE kyc_submissions
  DROP CONSTRAINT IF EXISTS kyc_submissions_reviewed_by_fkey;

ALTER TABLE kyc_submissions
  ADD CONSTRAINT kyc_submissions_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES admin_users(id)
  ON DELETE SET NULL;

ALTER TABLE jeweller_business_verifications
  DROP CONSTRAINT IF EXISTS jeweller_business_verifications_reviewed_by_fkey;

ALTER TABLE jeweller_business_verifications
  ADD CONSTRAINT jeweller_business_verifications_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES admin_users(id)
  ON DELETE SET NULL;

ALTER TABLE platform_commissions
  DROP CONSTRAINT IF EXISTS platform_commissions_waived_by_fkey;

ALTER TABLE platform_commissions
  ADD CONSTRAINT platform_commissions_waived_by_fkey
  FOREIGN KEY (waived_by) REFERENCES admin_users(id)
  ON DELETE SET NULL;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor_admin_id UUID REFERENCES admin_users(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_admin_id
  ON audit_logs(actor_admin_id);

COMMENT ON COLUMN kyc_submissions.reviewed_by IS
  'Admin user that reviewed this seller KYC submission.';

COMMENT ON COLUMN jeweller_business_verifications.reviewed_by IS
  'Admin user that reviewed this jeweller business verification.';

COMMENT ON COLUMN platform_commissions.waived_by IS
  'Admin user that waived this platform commission.';

COMMENT ON COLUMN audit_logs.actor_admin_id IS
  'Admin actor for generic marketplace audit events. User actors remain in actor_user_id.';
