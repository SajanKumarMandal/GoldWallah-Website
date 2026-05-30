import { query } from "../../config/db.js";

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    authProvider: row.auth_provider,
    kycStatus: row.kyc_status,
    businessVerificationStatus: row.business_verification_status,
    commissionLockStatus: row.commission_lock_status,
    createdAt: row.created_at,
  };
}

export async function findUserById(id) {
  const result = await query(
    `SELECT
      id,
      full_name,
      email,
      phone,
      role,
      auth_provider,
      kyc_status,
      business_verification_status,
      commission_lock_status,
      created_at
    FROM users
    WHERE id = $1`,
    [id],
  );

  return mapUser(result.rows[0]);
}
