import { randomUUID } from "node:crypto";

import { query } from "../../config/db.js";

function db(client) {
  // Repository functions accept an optional transaction client; otherwise they
  // use the shared pool query helper.
  return client || { query };
}

function mapUser(row) {
  // Convert database snake_case rows into the camelCase shape used by services
  // and frontend responses.
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
    accountStatus: row.account_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOtp(row) {
  // Normalize OTP records so service logic never depends on raw column names.
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    phone: row.phone,
    otpHash: row.otp_hash,
    purpose: row.purpose,
    deliveryStatus: row.delivery_status || "SENT",
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    attempts: row.attempts,
    sentAt: row.sent_at,
    failedAt: row.failed_at,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
  };
}

function mapRefreshToken(row) {
  // Refresh-token records store hashes only; plaintext tokens never live in DB.
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
  // Create a user with verification gates closed by default. KYC/business flows
  // must explicitly move these statuses forward.
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
      kyc_status,
      business_verification_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      "NOT_SUBMITTED",
      "NOT_SUBMITTED",
    ],
  );

  return mapUser(result.rows[0]);
}

export async function findOAuthAccount(provider, providerSubject, client) {
  // Look up a social identity by provider-specific subject, then return the
  // linked GoldWallah user.
  const result = await db(client).query(
    `SELECT users.*
     FROM user_oauth_accounts
     INNER JOIN users ON users.id = user_oauth_accounts.user_id
     WHERE user_oauth_accounts.provider = $1
       AND user_oauth_accounts.provider_subject = $2`,
    [provider, providerSubject],
  );

  return mapUser(result.rows[0]);
}

export async function linkOAuthAccount(data, client) {
  // Link a provider identity idempotently. If a race links the same provider
  // subject to another user, fail with a conflict.
  const result = await db(client).query(
    `INSERT INTO user_oauth_accounts (
      id,
      user_id,
      provider,
      provider_subject,
      email
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (provider, provider_subject)
    DO NOTHING
    RETURNING *`,
    [
      randomUUID(),
      data.userId,
      data.provider,
      data.providerSubject,
      data.email || null,
    ],
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  const existingResult = await db(client).query(
    `SELECT *
     FROM user_oauth_accounts
     WHERE provider = $1
       AND provider_subject = $2`,
    [data.provider, data.providerSubject],
  );
  const existingAccount = existingResult.rows[0];

  if (existingAccount?.user_id !== data.userId) {
    const error = new Error("OAuth identity is already linked");
    error.statusCode = 409;
    error.code = "OAUTH_IDENTITY_LINKED";
    throw error;
  }

  return existingAccount;
}

export async function findUserByEmail(email, client) {
  // Email lookup supports password auth and social-account linking.
  const result = await db(client).query("SELECT * FROM users WHERE email = $1", [email]);
  return mapUser(result.rows[0]);
}

export async function findUserByPhone(phone, client) {
  // Phone lookup supports OTP login and uniqueness checks.
  const result = await db(client).query("SELECT * FROM users WHERE phone = $1", [phone]);
  return mapUser(result.rows[0]);
}

export async function findUserById(id, client) {
  // ID lookup is used by refresh-token rotation and authenticated middleware.
  const result = await db(client).query("SELECT * FROM users WHERE id = $1", [id]);
  return mapUser(result.rows[0]);
}

export async function createOtp(data, client) {
  // Store only a hashed OTP with delivery state. Plaintext OTP is sent by the
  // provider and never persisted.
  const result = await db(client).query(
    `INSERT INTO otp_codes (
       id,
       phone,
       otp_hash,
       purpose,
       delivery_status,
       expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      randomUUID(),
      data.phone,
      data.otpHash,
      data.purpose,
      data.deliveryStatus || "PENDING",
      data.expiresAt,
    ],
  );

  return mapOtp(result.rows[0]);
}

export async function findLatestActiveOtp(phone, purpose, client) {
  // Only delivered, unconsumed, unexpired OTPs are valid for verification.
  const result = await db(client).query(
    `SELECT *
     FROM otp_codes
     WHERE phone = $1
       AND purpose = $2
       AND delivery_status = 'SENT'
       AND consumed_at IS NULL
       AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, purpose],
  );

  return mapOtp(result.rows[0]);
}

export async function findLatestResendBlockingOtp(phone, purpose, client) {
  // Pending or delivered OTPs block immediate resend attempts until cooldown ends.
  const result = await db(client).query(
    `SELECT *
     FROM otp_codes
     WHERE phone = $1
       AND purpose = $2
       AND delivery_status IN ('PENDING', 'SENT')
       AND consumed_at IS NULL
       AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, purpose],
  );

  return mapOtp(result.rows[0]);
}

export async function revokeActiveOtpCodes(phone, purpose, client) {
  // Invalidate older active OTPs before issuing a fresh code so only one OTP can
  // be verified at a time for a phone/purpose pair.
  const result = await db(client).query(
    `UPDATE otp_codes
     SET consumed_at = COALESCE(consumed_at, now()),
         delivery_status = CASE
           WHEN delivery_status IN ('PENDING', 'SENT') THEN 'CONSUMED'
           ELSE delivery_status
         END
     WHERE phone = $1
       AND purpose = $2
       AND delivery_status IN ('PENDING', 'SENT')
       AND consumed_at IS NULL
       AND expires_at > now()
     RETURNING *`,
    [phone, purpose],
  );

  return result.rows.map(mapOtp);
}

export async function markOtpSent(id, client) {
  // Mark delivery success after the provider accepts the OTP send request.
  const result = await db(client).query(
    `UPDATE otp_codes
     SET delivery_status = 'SENT',
         sent_at = now()
     WHERE id = $1
       AND consumed_at IS NULL
     RETURNING *`,
    [id],
  );

  return mapOtp(result.rows[0]);
}

export async function markOtpFailed(id, failureReason, client) {
  // Keep failed OTPs non-verifiable and preserve a safe diagnostic reason.
  const result = await db(client).query(
    `UPDATE otp_codes
     SET delivery_status = 'FAILED',
         failed_at = now(),
         failure_reason = LEFT($2, 255),
         consumed_at = COALESCE(consumed_at, now())
     WHERE id = $1
     RETURNING *`,
    [id, failureReason || "OTP delivery failed"],
  );

  return mapOtp(result.rows[0]);
}

export async function incrementOtpAttempts(id, client) {
  // Track failed verification attempts to cap brute-force retries per OTP.
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
  // Mark an OTP used so it cannot be replayed after successful verification.
  const result = await db(client).query(
    `UPDATE otp_codes
     SET consumed_at = now(),
         delivery_status = 'CONSUMED'
     WHERE id = $1
     RETURNING *`,
    [id],
  );

  return mapOtp(result.rows[0]);
}

export async function saveRefreshToken(data, client) {
  // Persist the refresh-token hash so rotation/revocation works across app
  // instances behind a load balancer.
  const result = await db(client).query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [randomUUID(), data.userId, data.tokenHash, data.expiresAt],
  );

  return mapRefreshToken(result.rows[0]);
}

export async function revokeRefreshToken(tokenHash, client) {
  // Idempotently mark one refresh token as revoked.
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
  // Fetch only active refresh tokens. Kept for callers that do not need reuse
  // detection on revoked records.
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
  // Fetch a refresh token regardless of revoked status so the service can detect
  // token reuse and revoke the session family.
  const result = await db(client).query(
    `SELECT *
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [tokenHash],
  );

  return mapRefreshToken(result.rows[0]);
}

export async function revokeAllActiveRefreshTokens(userId, client) {
  // Revoke every active token for a user after suspected refresh-token reuse or
  // account deactivation.
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
  // Strip server-only credential material before user data leaves the auth layer.
  if (!user) {
    return null;
  }

  const safeUser = { ...user };
  delete safeUser.passwordHash;
  return safeUser;
}
