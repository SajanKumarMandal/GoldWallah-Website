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
    profileCity: row.profile_city,
    profileState: row.profile_state,
    profileLatitude:
      row.profile_latitude === null || row.profile_latitude === undefined
        ? null
        : Number(row.profile_latitude),
    profileLongitude:
      row.profile_longitude === null || row.profile_longitude === undefined
        ? null
        : Number(row.profile_longitude),
    profileLocationUpdatedAt: row.profile_location_updated_at,
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
      profile_city,
      profile_state,
      profile_latitude,
      profile_longitude,
      profile_location_updated_at,
      created_at
    FROM users
    WHERE id = $1`,
    [id],
  );

  return mapUser(result.rows[0]);
}

export async function updateUserProfileLocation(userId, location) {
  const result = await query(
    `UPDATE users
     SET
       profile_latitude = $2,
       profile_longitude = $3,
       profile_location_updated_at = now()
     WHERE id = $1
     RETURNING
       id,
       full_name,
       email,
       phone,
       role,
       auth_provider,
       kyc_status,
       business_verification_status,
       commission_lock_status,
       profile_city,
       profile_state,
       profile_latitude,
       profile_longitude,
       profile_location_updated_at,
       created_at`,
    [userId, location.latitude, location.longitude],
  );

  return mapUser(result.rows[0]);
}
