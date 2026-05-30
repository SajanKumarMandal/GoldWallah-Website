import { randomUUID } from "node:crypto";

import { query } from "../../config/db.js";

function db(client) {
  return client || { query };
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    passwordHash: row.password_hash,
    role: row.role,
    authProvider: row.auth_provider,
    isEmailVerified: row.is_email_verified,
    isPhoneVerified: row.is_phone_verified,
    kycStatus: row.kyc_status,
    businessVerificationStatus: row.business_verification_status,
    commissionLockStatus: row.commission_lock_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOtp(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    phone: row.phone,
    otpHash: row.otp_hash,
    purpose: row.purpose,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    attempts: row.attempts,
    createdAt: row.created_at,
  };
}

function mapRefreshToken(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

export async function createUser(data, client) {
  const result = await db(client).query(
    `INSERT INTO users (
      id,
      full_name,
      email,
      phone,
      password_hash,
      role,
      auth_provider,
      is_email_verified,
      is_phone_verified,
      business_verification_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      randomUUID(),
      data.fullName,
      data.email || null,
      data.phone || null,
      data.passwordHash || null,
      data.role,
      data.authProvider,
      Boolean(data.isEmailVerified),
      Boolean(data.isPhoneVerified),
      data.role === "JEWELLER" ? "PENDING" : "PENDING",
    ],
  );

  return mapUser(result.rows[0]);
}

export async function findUserByEmail(email, client) {
  const result = await db(client).query("SELECT * FROM users WHERE email = $1", [email]);
  return mapUser(result.rows[0]);
}

export async function findUserByPhone(phone, client) {
  const result = await db(client).query("SELECT * FROM users WHERE phone = $1", [phone]);
  return mapUser(result.rows[0]);
}

export async function findUserById(id, client) {
  const result = await db(client).query("SELECT * FROM users WHERE id = $1", [id]);
  return mapUser(result.rows[0]);
}

export async function createOtp(data, client) {
  const result = await db(client).query(
    `INSERT INTO otp_codes (id, phone, otp_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [randomUUID(), data.phone, data.otpHash, data.purpose, data.expiresAt],
  );

  return mapOtp(result.rows[0]);
}

export async function findLatestActiveOtp(phone, purpose, client) {
  const result = await db(client).query(
    `SELECT *
     FROM otp_codes
     WHERE phone = $1
       AND purpose = $2
       AND consumed_at IS NULL
       AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, purpose],
  );

  return mapOtp(result.rows[0]);
}

export async function incrementOtpAttempts(id, client) {
  const result = await db(client).query(
    `UPDATE otp_codes
     SET attempts = attempts + 1
     WHERE id = $1
     RETURNING *`,
    [id],
  );

  return mapOtp(result.rows[0]);
}

export async function consumeOtp(id, client) {
  const result = await db(client).query(
    `UPDATE otp_codes
     SET consumed_at = now()
     WHERE id = $1
     RETURNING *`,
    [id],
  );

  return mapOtp(result.rows[0]);
}

export async function saveRefreshToken(data, client) {
  const result = await db(client).query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [randomUUID(), data.userId, data.tokenHash, data.expiresAt],
  );

  return mapRefreshToken(result.rows[0]);
}

export async function revokeRefreshToken(tokenHash, client) {
  const result = await db(client).query(
    `UPDATE refresh_tokens
     SET revoked_at = COALESCE(revoked_at, now())
     WHERE token_hash = $1
     RETURNING *`,
    [tokenHash],
  );

  return mapRefreshToken(result.rows[0]);
}

export async function findRefreshToken(tokenHash, client) {
  const result = await db(client).query(
    `SELECT *
     FROM refresh_tokens
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > now()`,
    [tokenHash],
  );

  return mapRefreshToken(result.rows[0]);
}

export async function findRefreshTokenByHash(tokenHash, client) {
  const result = await db(client).query(
    `SELECT *
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [tokenHash],
  );

  return mapRefreshToken(result.rows[0]);
}

export async function revokeAllActiveRefreshTokens(userId, client) {
  const result = await db(client).query(
    `UPDATE refresh_tokens
     SET revoked_at = COALESCE(revoked_at, now())
     WHERE user_id = $1
       AND revoked_at IS NULL
     RETURNING *`,
    [userId],
  );

  return result.rows.map(mapRefreshToken);
}

export function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const safeUser = { ...user };
  delete safeUser.passwordHash;
  return safeUser;
}
