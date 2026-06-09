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
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    attempts: row.attempts,
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

function mapSecurityToken(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    createdAt: row.created_at,
  };
}

function mapLoginAttempt(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    identityHash: row.identity_hash,
    scope: row.scope,
    userId: row.user_id,
    failedCount: row.failed_count,
    lockedUntil: row.locked_until,
    lastFailedAt: row.last_failed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

export async function updateUserPasswordHash(userId, passwordHash, client) {
  const result = await db(client).query(
    `UPDATE users
     SET password_hash = $2,
         auth_provider = CASE
           WHEN auth_provider = 'PHONE' THEN 'EMAIL'
           ELSE auth_provider
         END,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [userId, passwordHash],
  );

  return mapUser(result.rows[0]);
}

export async function markUserEmailVerified(userId, client) {
  const result = await db(client).query(
    `UPDATE users
     SET is_email_verified = true,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [userId],
  );

  return mapUser(result.rows[0]);
}

export async function updateUserPhoneVerified(userId, phone, client) {
  const result = await db(client).query(
    `UPDATE users
     SET phone = $2,
         is_phone_verified = true,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [userId, phone],
  );

  return mapUser(result.rows[0]);
}

export async function createOtp(data, client) {
  // Store only a hashed OTP with expiry and purpose; plaintext OTP is sent by
  // the provider and never persisted.
  const result = await db(client).query(
    `INSERT INTO otp_codes (id, phone, otp_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [randomUUID(), data.phone, data.otpHash, data.purpose, data.expiresAt],
  );

  return mapOtp(result.rows[0]);
}

export async function createPasswordResetToken(data, client) {
  const result = await db(client).query(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [randomUUID(), data.userId, data.tokenHash, data.expiresAt],
  );

  return mapSecurityToken(result.rows[0]);
}

export async function findPasswordResetTokenByHash(tokenHash, client) {
  const result = await db(client).query(
    `SELECT *
     FROM password_reset_tokens
     WHERE token_hash = $1`,
    [tokenHash],
  );

  return mapSecurityToken(result.rows[0]);
}

export async function consumePasswordResetToken(id, client) {
  const result = await db(client).query(
    `UPDATE password_reset_tokens
     SET consumed_at = COALESCE(consumed_at, now())
     WHERE id = $1
     RETURNING *`,
    [id],
  );

  return mapSecurityToken(result.rows[0]);
}

export async function createEmailVerificationToken(data, client) {
  const result = await db(client).query(
    `INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [randomUUID(), data.userId, data.tokenHash, data.expiresAt],
  );

  return mapSecurityToken(result.rows[0]);
}

export async function findEmailVerificationTokenByHash(tokenHash, client) {
  const result = await db(client).query(
    `SELECT *
     FROM email_verification_tokens
     WHERE token_hash = $1`,
    [tokenHash],
  );

  return mapSecurityToken(result.rows[0]);
}

export async function consumeEmailVerificationToken(id, client) {
  const result = await db(client).query(
    `UPDATE email_verification_tokens
     SET consumed_at = COALESCE(consumed_at, now())
     WHERE id = $1
     RETURNING *`,
    [id],
  );

  return mapSecurityToken(result.rows[0]);
}

export async function findLatestActiveOtp(phone, purpose, client) {
  // Only unconsumed, unexpired OTPs are valid for verification.
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
     SET consumed_at = now()
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

export async function revokeAllActiveRefreshTokensExcept(userId, tokenHash, client) {
  const result = await db(client).query(
    `UPDATE refresh_tokens
     SET revoked_at = COALESCE(revoked_at, now())
     WHERE user_id = $1
       AND token_hash <> $2
       AND revoked_at IS NULL
     RETURNING *`,
    [userId, tokenHash],
  );

  return result.rows.map(mapRefreshToken);
}

export async function findLoginAttempt(scope, identityHash, client) {
  const result = await db(client).query(
    `SELECT *
     FROM auth_login_attempts
     WHERE scope = $1
       AND identity_hash = $2`,
    [scope, identityHash],
  );

  return mapLoginAttempt(result.rows[0]);
}

export async function recordLoginFailure(
  { scope, identityHash, userId, lockedUntil },
  client,
) {
  const result = await db(client).query(
    `INSERT INTO auth_login_attempts (
       id,
       scope,
       identity_hash,
       user_id,
       failed_count,
       locked_until,
       last_failed_at
     )
     VALUES ($1, $2, $3, $4, 1, $5, now())
     ON CONFLICT (scope, identity_hash)
     DO UPDATE SET
       user_id = COALESCE(EXCLUDED.user_id, auth_login_attempts.user_id),
       failed_count = auth_login_attempts.failed_count + 1,
       locked_until = EXCLUDED.locked_until,
       last_failed_at = now(),
       updated_at = now()
     RETURNING *`,
    [randomUUID(), scope, identityHash, userId || null, lockedUntil || null],
  );

  return mapLoginAttempt(result.rows[0]);
}

export async function clearLoginAttempt(scope, identityHash, client) {
  await db(client).query(
    `DELETE FROM auth_login_attempts
     WHERE scope = $1
       AND identity_hash = $2`,
    [scope, identityHash],
  );
}

export async function createAuthAuditLog(data, client) {
  const result = await db(client).query(
    `INSERT INTO auth_audit_logs (
       id,
       user_id,
       event_type,
       ip_hash,
       user_agent,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      randomUUID(),
      data.userId || null,
      data.eventType,
      data.ipHash || null,
      data.userAgent || null,
      JSON.stringify(data.metadata || {}),
    ],
  );

  return result.rows[0];
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
