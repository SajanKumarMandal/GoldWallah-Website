import { randomUUID } from "node:crypto";

import { query } from "../../config/db.js";
import {
  mapJewellerVerification,
  mapJewellerVerificationWithEncryptedIdentity,
} from "./jewellerVerification.mapper.js";

function db(client) {
  return client || { query };
}

export async function findLatestJewellerVerification(jewellerId, client) {
  const result = await db(client).query(
    `SELECT *
     FROM jeweller_business_verifications
     WHERE jeweller_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [jewellerId],
  );

  return mapJewellerVerification(result.rows[0]);
}

export async function findPendingJewellerVerification(jewellerId, client) {
  const result = await db(client).query(
    `SELECT *
     FROM jeweller_business_verifications
     WHERE jeweller_id = $1
       AND status = 'PENDING'
     ORDER BY created_at DESC
     LIMIT 1`,
    [jewellerId],
  );

  return mapJewellerVerification(result.rows[0]);
}

export async function createJewellerVerification(data, client) {
  const result = await db(client).query(
    `INSERT INTO jeweller_business_verifications (
      id,
      jeweller_id,
      shop_name,
      owner_name,
      business_mobile,
      business_email,
      gst_number_encrypted,
      gst_number_hash,
      gst_last4,
      shop_license_number_encrypted,
      shop_license_number_hash,
      shop_license_last4,
      business_address,
      city,
      state,
      pincode,
      latitude,
      longitude,
      shop_opening_time,
      shop_closing_time,
      years_in_business,
      business_type,
      shop_front_image_url,
      gst_certificate_image_url,
      shop_license_image_url,
      status
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, 'PENDING'
    )
    RETURNING *`,
    [
      randomUUID(),
      data.jewellerId,
      data.shopName,
      data.ownerName,
      data.businessMobile,
      data.businessEmail ?? null,
      data.gstNumberEncrypted ?? null,
      data.gstNumberHash ?? null,
      data.gstLast4 ?? null,
      data.shopLicenseNumberEncrypted ?? null,
      data.shopLicenseNumberHash ?? null,
      data.shopLicenseLast4 ?? null,
      data.businessAddress,
      data.city,
      data.state,
      data.pincode,
      data.latitude,
      data.longitude,
      data.shopOpeningTime ?? null,
      data.shopClosingTime ?? null,
      data.yearsInBusiness ?? null,
      data.businessType ?? null,
      data.shopFrontImageUrl,
      data.gstCertificateImageUrl ?? null,
      data.shopLicenseImageUrl ?? null,
    ],
  );

  return mapJewellerVerification(result.rows[0]);
}

export async function updateUserBusinessVerificationStatus(userId, status, client) {
  const result = await db(client).query(
    `UPDATE users
     SET business_verification_status = $2,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [userId, status],
  );

  return result.rows[0] || null;
}

export async function listJewellerVerifications({ status, limit }, client) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const params = [safeLimit];
  const statusFilter = status ? "WHERE status = $2" : "";

  if (status) {
    params.push(status);
  }

  const result = await db(client).query(
    `SELECT *
     FROM jeweller_business_verifications
     ${statusFilter}
     ORDER BY created_at DESC
     LIMIT $1`,
    params,
  );

  return result.rows.map((row) =>
    mapJewellerVerification(row, { includeAdminFields: true }),
  );
}

export async function findJewellerVerificationById(id, client) {
  const result = await db(client).query(
    `SELECT *
     FROM jeweller_business_verifications
     WHERE id = $1`,
    [id],
  );

  return mapJewellerVerification(result.rows[0], { includeAdminFields: true });
}

export async function findJewellerVerificationWithEncryptedIdentityById(id, client) {
  const result = await db(client).query(
    `SELECT *
     FROM jeweller_business_verifications
     WHERE id = $1`,
    [id],
  );

  return mapJewellerVerificationWithEncryptedIdentity(result.rows[0]);
}

export async function approveJewellerVerification({ id, reviewedBy, reviewNotes }, client) {
  const result = await db(client).query(
    `UPDATE jeweller_business_verifications
     SET status = 'APPROVED',
         rejection_reason = NULL,
         reviewed_by = $2,
         reviewed_at = now(),
         review_notes = $3,
         updated_at = now()
     WHERE id = $1
       AND status = 'PENDING'
     RETURNING *`,
    [id, reviewedBy, reviewNotes],
  );

  return mapJewellerVerification(result.rows[0], { includeAdminFields: true });
}

export async function rejectJewellerVerification(
  { id, reviewedBy, rejectionReason, reviewNotes },
  client,
) {
  const result = await db(client).query(
    `UPDATE jeweller_business_verifications
     SET status = 'REJECTED',
         rejection_reason = $3,
         reviewed_by = $2,
         reviewed_at = now(),
         review_notes = $4,
         updated_at = now()
     WHERE id = $1
       AND status = 'PENDING'
     RETURNING *`,
    [id, reviewedBy, rejectionReason, reviewNotes],
  );

  return mapJewellerVerification(result.rows[0], { includeAdminFields: true });
}

export async function createAuditLog(
  {
    actorUserId,
    actorAdminId,
    action,
    entityType,
    entityId,
    metadata = {},
    ipAddress,
    userAgent,
  },
  client,
) {
  const result = await db(client).query(
    `INSERT INTO audit_logs (
      id,
      actor_user_id,
      actor_admin_id,
      action,
      entity_type,
      entity_id,
      metadata,
      ip_address,
      user_agent
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
    RETURNING *`,
    [
      randomUUID(),
      actorUserId ?? null,
      actorAdminId ?? null,
      action,
      entityType,
      entityId ?? null,
      JSON.stringify(metadata),
      ipAddress ?? null,
      userAgent ?? null,
    ],
  );

  return result.rows[0];
}
