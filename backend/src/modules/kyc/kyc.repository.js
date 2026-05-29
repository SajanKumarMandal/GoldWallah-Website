import { randomUUID } from "node:crypto";

import { query } from "../../config/db.js";

function db(client) {
  return client || { query };
}

function mapKycSubmission(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    mobileNumber: row.mobile_number,
    addressAsPerAadhaar: row.address_as_per_aadhaar,
    aadhaarLast4: row.aadhaar_last4,
    panLast4: row.pan_last4,
    selfieImageUrl: row.selfie_image_url,
    selfieCapturedAt: row.selfie_captured_at,
    status: row.status,
    rejectionReason: row.rejection_reason,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapKycSubmissionWithEncryptedIdentity(row) {
  if (!row) {
    return null;
  }

  return {
    ...mapKycSubmission(row),
    aadhaarNumberEncrypted: row.aadhaar_number_encrypted,
    panNumberEncrypted: row.pan_number_encrypted,
  };
}

export async function findLatestSellerKyc(userId, client) {
  const result = await db(client).query(
    `SELECT *
     FROM kyc_submissions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );

  return mapKycSubmission(result.rows[0]);
}

export async function findPendingSellerKyc(userId, client) {
  const result = await db(client).query(
    `SELECT *
     FROM kyc_submissions
     WHERE user_id = $1
       AND status = 'PENDING'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId],
  );

  return mapKycSubmission(result.rows[0]);
}

export async function createSellerKycSubmission(data, client) {
  const result = await db(client).query(
    `INSERT INTO kyc_submissions (
      id,
      user_id,
      full_name,
      mobile_number,
      address_as_per_aadhaar,
      aadhaar_number_hash,
      aadhaar_number_encrypted,
      pan_number_hash,
      pan_number_encrypted,
      aadhaar_last4,
      pan_last4,
      selfie_image_url,
      selfie_captured_at,
      status
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PENDING'
    )
    RETURNING *`,
    [
      randomUUID(),
      data.userId,
      data.fullName,
      data.mobileNumber,
      data.addressAsPerAadhaar,
      data.aadhaarNumberHash,
      data.aadhaarNumberEncrypted,
      data.panNumberHash,
      data.panNumberEncrypted,
      data.aadhaarLast4,
      data.panLast4,
      data.selfieImageUrl,
      data.selfieCapturedAt,
    ],
  );

  return mapKycSubmission(result.rows[0]);
}

export async function updateUserKycStatus(userId, status, client) {
  const result = await db(client).query(
    `UPDATE users
     SET kyc_status = $2,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [userId, status],
  );

  return result.rows[0] || null;
}

export async function listSellerKycSubmissions({ status }, client) {
  const params = [];
  const statusFilter = status ? "WHERE k.status = $1" : "";

  if (status) {
    params.push(status);
  }

  const result = await db(client).query(
    `SELECT k.*
     FROM kyc_submissions k
     JOIN users u ON u.id = k.user_id
     ${statusFilter}
     ORDER BY k.created_at DESC`,
    params,
  );

  return result.rows.map(mapKycSubmission);
}

export async function findKycSubmissionById(id, client) {
  const result = await db(client).query(
    `SELECT *
     FROM kyc_submissions
     WHERE id = $1`,
    [id],
  );

  return mapKycSubmission(result.rows[0]);
}

export async function findKycSubmissionWithEncryptedIdentityById(id, client) {
  const result = await db(client).query(
    `SELECT *
     FROM kyc_submissions
     WHERE id = $1`,
    [id],
  );

  return mapKycSubmissionWithEncryptedIdentity(result.rows[0]);
}

export async function approveKycSubmission({ id, reviewedBy }, client) {
  const result = await db(client).query(
    `UPDATE kyc_submissions
     SET status = 'APPROVED',
         rejection_reason = NULL,
         reviewed_by = $2,
         reviewed_at = now(),
         updated_at = now()
     WHERE id = $1
       AND status = 'PENDING'
     RETURNING *`,
    [id, reviewedBy],
  );

  return mapKycSubmission(result.rows[0]);
}

export async function rejectKycSubmission({ id, reviewedBy, rejectionReason }, client) {
  const result = await db(client).query(
    `UPDATE kyc_submissions
     SET status = 'REJECTED',
         rejection_reason = $3,
         reviewed_by = $2,
         reviewed_at = now(),
         updated_at = now()
     WHERE id = $1
       AND status = 'PENDING'
     RETURNING *`,
    [id, reviewedBy, rejectionReason],
  );

  return mapKycSubmission(result.rows[0]);
}
