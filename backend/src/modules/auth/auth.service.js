import { createHash, randomBytes, randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { withTransaction } from "../../config/db.js";
import { env } from "../../config/env.js";
import { AUTH_AUDIT_EVENTS, writeAuthAudit } from "./auth.audit.js";
import { verifyFacebookAccessToken } from "./providers/facebookAuth.provider.js";
import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from "./providers/email.provider.js";
import { verifyGoogleIdToken } from "./providers/googleAuth.provider.js";
import {
  generateOtp,
  sendOtp,
  usesProviderManagedOtpVerification,
  verifyOtpWithProvider,
} from "./providers/otp.provider.js";
import {
  createUser,
  createOtp,
  clearLoginAttempt,
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  createEmailVerificationToken,
  createPasswordResetToken,
  findLatestActiveOtp,
  findLoginAttempt,
  findEmailVerificationTokenByHash,
  findOAuthAccount,
  findPasswordResetTokenByHash,
  findRefreshTokenByHash,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  incrementOtpAttempts,
  linkOAuthAccount,
  markUserEmailVerified,
  recordLoginFailure,
  consumeOtp,
  revokeAllActiveRefreshTokens,
  revokeAllActiveRefreshTokensExcept,
  revokeRefreshToken,
  saveRefreshToken,
  sanitizeUser,
  updateUserPasswordHash,
  updateUserPhoneVerified,
} from "./auth.repository.js";
import { AUTH_ROLES, normalizePhone } from "./auth.validation.js";

// User authentication service: owns registration/login, OTP verification,
// access-token creation, and refresh-token rotation/reuse handling.
const OTP_PURPOSES = {
  login: "LOGIN",
  register: "REGISTER",
  phoneVerify: "PHONE_VERIFY",
};
const REFRESH_REUSE_GRACE_MS = 30 * 1000;
const PASSWORD_FORGOT_RESPONSE = {
  success: true,
  message: "If an account exists for this email, password reset instructions will be sent.",
};

function createError(message, statusCode, code) {
  // Services throw normalized errors so the shared error handler can return
  // consistent status codes and safe public messages.
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function toRole(role) {
  // Fail closed on role tampering before any user row is created.
  const normalizedRole = typeof role === "string" ? role.trim().toUpperCase() : "";

  if (!Object.values(AUTH_ROLES).includes(normalizedRole)) {
    throw createError("Invalid account role", 400, "INVALID_ROLE");
  }

  return normalizedRole;
}

function hashToken(token) {
  // Refresh tokens are bearer credentials, so only a hash is stored in Postgres.
  return createHash("sha256").update(token).digest("hex");
}

function generateSecurityToken() {
  return randomBytes(32).toString("base64url");
}

function expiresInMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function expiresInHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function hashIdentity(value) {
  const normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!normalizedValue) {
    return "";
  }

  const secret = env.kycIdentityHashSecret || env.jwtAccessSecret || "goldwallah-test";
  return createHash("sha256")
    .update(`${secret}:${normalizedValue}`)
    .digest("hex");
}

function isExpired(dateValue) {
  return new Date(dateValue).getTime() <= Date.now();
}

function buildFrontendUrl(path, token) {
  const url = new URL(path, env.frontendUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function isLocked(attempt) {
  if (!attempt?.lockedUntil) {
    return false;
  }

  return new Date(attempt.lockedUntil).getTime() > Date.now();
}

async function assertLoginAllowed({ email, requestMeta }, client) {
  const emailHash = hashIdentity(email);
  const ipHash = hashIdentity(requestMeta?.ip);
  const attempts = await Promise.all([
    emailHash ? findLoginAttempt("EMAIL", emailHash, client) : null,
    ipHash ? findLoginAttempt("IP", ipHash, client) : null,
  ]);

  if (attempts.some(isLocked)) {
    throw createError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }
}

async function recordFailedPasswordLogin({ email, user, requestMeta }, client) {
  const lockedUntil = new Date(
    Date.now() + env.authLoginLockMinutes * 60 * 1000,
  ).toISOString();
  const emailHash = hashIdentity(email);
  const ipHash = hashIdentity(requestMeta?.ip);

  for (const [scope, identityHash] of [
    ["EMAIL", emailHash],
    ["IP", ipHash],
  ]) {
    if (!identityHash) {
      continue;
    }

    const currentAttempt = await findLoginAttempt(scope, identityHash, client);
    const nextFailureCount = (currentAttempt?.failedCount || 0) + 1;
    await recordLoginFailure(
      {
        scope,
        identityHash,
        userId: user?.id,
        lockedUntil:
          nextFailureCount >= env.authLoginMaxFailedAttempts ? lockedUntil : null,
      },
      client,
    );
  }
}

async function clearPasswordLoginFailures({ email, requestMeta }, client) {
  const emailHash = hashIdentity(email);
  const ipHash = hashIdentity(requestMeta?.ip);

  await Promise.all([
    emailHash ? clearLoginAttempt("EMAIL", emailHash, client) : null,
    ipHash ? clearLoginAttempt("IP", ipHash, client) : null,
  ]);
}

function getTokenExpiry(token) {
  // Store the JWT expiry alongside the token hash for fast DB-side validity checks.
  const decoded = jwt.decode(token);

  if (!decoded?.exp) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  return new Date(decoded.exp * 1000).toISOString();
}

function isRecentlyRevoked(refreshTokenRecord) {
  // A short grace window prevents harmless double-submit races from being
  // treated as refresh-token theft.
  if (!refreshTokenRecord?.revokedAt) {
    return false;
  }

  const revokedAtMs = new Date(refreshTokenRecord.revokedAt).getTime();

  return Number.isFinite(revokedAtMs) && Date.now() - revokedAtMs <= REFRESH_REUSE_GRACE_MS;
}

async function createAuthResponse(user, message, client) {
  // Shared session issuer for every auth method: email/password, OTP, and OAuth.
  if (user?.accountStatus !== "ACTIVE") {
    throw createError("Account is not active", 403, "ACCOUNT_INACTIVE");
  }

  // The controller stores refreshToken in an HttpOnly cookie so frontend
  // JavaScript cannot read it. accessToken remains short-lived.
  const safeUser = sanitizeUser(user);
  const tokenPayload = {
    sub: safeUser.id,
    role: safeUser.role,
  };

  if (!env.jwtAccessSecret && env.nodeEnv !== "test") {
    throw createError(
      "Authentication is not configured",
      500,
      "AUTH_NOT_CONFIGURED",
    );
  }

  const accessToken = env.jwtAccessSecret
    ? jwt.sign(tokenPayload, env.jwtAccessSecret, {
        expiresIn: env.jwtAccessExpiresIn,
        issuer: "goldwallah-api",
        audience: "goldwallah-web",
        algorithm: "HS256",
      })
    : null;
  const refreshToken = env.jwtRefreshSecret
    ? jwt.sign({ ...tokenPayload, jti: randomUUID() }, env.jwtRefreshSecret, {
        expiresIn: env.jwtRefreshExpiresIn,
        issuer: "goldwallah-api",
        audience: "goldwallah-web",
        algorithm: "HS256",
      })
    : null;

  if (refreshToken) {
    // Save refresh-token hash inside the same transaction when a caller passes
    // a transaction client.
    await saveRefreshToken(
      {
        userId: safeUser.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: getTokenExpiry(refreshToken),
      },
      client,
    );
  }

  return {
    success: true,
    message,
    data: {
      user: safeUser,
      accessToken,
      refreshToken,
    },
  };
}

function verifyRefreshToken(refreshToken) {
  // Verify signature, issuer, audience, and algorithm before trusting claims.
  if (!env.jwtRefreshSecret) {
    throw createError(
      "Refresh authentication is not configured",
      500,
      "REFRESH_AUTH_NOT_CONFIGURED",
    );
  }

  try {
    return jwt.verify(refreshToken, env.jwtRefreshSecret, {
      issuer: "goldwallah-api",
      audience: "goldwallah-web",
      algorithms: ["HS256"],
    });
  } catch {
    throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
  }
}

async function ensureUniqueIdentity({ email, phone }, client) {
  // Enforce friendly duplicate errors before relying on database unique indexes.
  if (email && (await findUserByEmail(email, client))) {
    throw createError("Account already exists", 409, "ACCOUNT_EXISTS");
  }

  if (phone && (await findUserByPhone(phone, client))) {
    throw createError("Account already exists", 409, "ACCOUNT_EXISTS");
  }
}

async function hashSecret(secret) {
  // Passwords and OTPs use bcrypt with environment-controlled work factor.
  return bcrypt.hash(secret, env.bcryptSaltRounds);
}

async function verifyOtp({ phone, otp, purpose, client }) {
  // OTP verification checks active status, attempt count, and then consumes the
  // OTP to prevent replay.
  const otpRecord = await findLatestActiveOtp(phone, purpose, client);

  if (!otpRecord) {
    throw createError("Invalid or expired OTP", 400, "INVALID_OTP");
  }

  if (otpRecord.attempts >= 5) {
    throw createError("Invalid or expired OTP", 400, "OTP_ATTEMPTS_EXCEEDED");
  }

  const isDevelopmentMockOtp =
    !env.isProduction && env.otpProvider === "mock" && otp === "123456";
  const isMatch = usesProviderManagedOtpVerification()
    ? await verifyOtpWithProvider({ phone, otp })
    : isDevelopmentMockOtp || (await bcrypt.compare(otp, otpRecord.otpHash));

  if (!isMatch) {
    // Increment attempts only after a wrong OTP, then return a generic failure.
    await incrementOtpAttempts(otpRecord.id, client);
    throw createError("Invalid or expired OTP", 400, "INVALID_OTP");
  }

  await consumeOtp(otpRecord.id, client);
}

async function createAndSendOtp({ phone, purpose, requestMeta }) {
  // OTP send applies a resend cooldown before generating and storing a new code.
  const existingOtp = await findLatestActiveOtp(phone, purpose);
  const cooldownMs = env.otpResendCooldownSeconds * 1000;

  if (
    existingOtp &&
    Date.now() - new Date(existingOtp.createdAt).getTime() < cooldownMs
  ) {
    throw createError("Please wait before requesting another OTP", 429, "OTP_COOLDOWN");
  }

  const providerManagedOtp = usesProviderManagedOtpVerification();
  const otp = providerManagedOtp ? undefined : generateOtp();
  // Store a hash only. For provider-managed OTPs this is an opaque nonce used
  // to preserve local cooldown, expiry, attempt, and replay controls.
  const otpHash = await hashSecret(providerManagedOtp ? randomUUID() : otp);
  const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000).toISOString();

  const providerResult = await sendOtp({
    phone,
    otp,
    rateLimitContext: {
      phone,
      ip: requestMeta?.ip,
    },
  });

  if (!providerResult.configured) {
    const error = createError(providerResult.message, 503, "OTP_NOT_CONFIGURED");
    throw error;
  }

  await createOtp({
    phone,
    otpHash,
    purpose,
    expiresAt,
  });

  return {
    success: true,
    message: providerResult.message,
    data: {
      configured: providerResult.configured,
      expiresInMinutes: env.otpExpiryMinutes,
      resendCooldownSeconds: env.otpResendCooldownSeconds,
    },
  };
}

export async function registerWithEmail(payload, requestMeta = {}) {
  // Email registration stores the user and refresh token in one transaction so
  // a failed session write cannot leave a half-created login response.
  const email = payload.email.toLowerCase();
  const phone = normalizePhone(payload.phone);
  const passwordHash = await hashSecret(payload.password);

  return withTransaction(async (client) => {
    await ensureUniqueIdentity({ email, phone }, client);

    let user;

    try {
      user = await createUser(
        {
          fullName: payload.fullName,
          email,
          phone,
          passwordHash,
          role: toRole(payload.role),
          authProvider: "EMAIL",
          isEmailVerified: false,
          isPhoneVerified: false,
        },
        client,
      );
    } catch (error) {
      if (error.code === "23505") {
        throw createError("Account already exists", 409, "ACCOUNT_EXISTS");
      }

      throw error;
    }

    await writeAuthAudit(
      {
        userId: user.id,
        eventType: AUTH_AUDIT_EVENTS.registerSuccess,
        requestMeta,
        metadata: { method: "email" },
      },
      client,
    );

    return createAuthResponse(user, "Account registered successfully", client);
  });
}

export async function loginWithEmail(payload, requestMeta = {}) {
  // Use a single public error for missing users and password mismatch to avoid
  // account enumeration.
  const email = payload.email.toLowerCase();
  const invalidLoginError = createError(
    "Invalid email or password",
    401,
    "INVALID_CREDENTIALS",
  );

  return withTransaction(async (client) => {
    await assertLoginAllowed({ email, requestMeta }, client);
    const user = await findUserByEmail(email, client);

    if (!user?.passwordHash) {
      await recordFailedPasswordLogin({ email, user, requestMeta });
      await writeAuthAudit(
        {
          userId: user?.id,
          eventType: AUTH_AUDIT_EVENTS.loginFailed,
          requestMeta,
          metadata: { method: "email", reason: "invalid_credentials" },
        },
      );
      throw invalidLoginError;
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);

    if (!isPasswordValid) {
      await recordFailedPasswordLogin({ email, user, requestMeta });
      await writeAuthAudit(
        {
          userId: user.id,
          eventType: AUTH_AUDIT_EVENTS.loginFailed,
          requestMeta,
          metadata: { method: "email", reason: "invalid_credentials" },
        },
      );
      throw invalidLoginError;
    }

    await clearPasswordLoginFailures({ email, requestMeta }, client);
    await writeAuthAudit(
      {
        userId: user.id,
        eventType: AUTH_AUDIT_EVENTS.loginSuccess,
        requestMeta,
        metadata: { method: "email" },
      },
      client,
    );
    return createAuthResponse(user, "Login successful", client);
  });
}

export async function refreshUserSession({ refreshToken, requestMeta = {} }) {
  // Rotate refresh tokens atomically. Old token hash is revoked and a fresh token
  // is saved before the response is returned.
  const refreshTokenHash = hashToken(refreshToken);

  return withTransaction(async (client) => {
    const existingRefreshToken = await findRefreshTokenByHash(
      refreshTokenHash,
      client,
    );

    if (!existingRefreshToken) {
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (existingRefreshToken.revokedAt) {
      // Reuse of an older revoked token can indicate theft; revoke the whole
      // session family unless it is within the race-condition grace window.
      if (isRecentlyRevoked(existingRefreshToken)) {
        throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
      }

      await revokeAllActiveRefreshTokens(existingRefreshToken.userId);
      await writeAuthAudit(
        {
          userId: existingRefreshToken.userId,
          eventType: AUTH_AUDIT_EVENTS.tokenReuseDetected,
          requestMeta,
        },
      );
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (new Date(existingRefreshToken.expiresAt).getTime() <= Date.now()) {
      // Expired refresh tokens are revoked so future attempts are tracked.
      await revokeRefreshToken(refreshTokenHash);
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const payload = verifyRefreshToken(refreshToken);

    if (payload.sub !== existingRefreshToken.userId) {
      // A valid JWT paired with a different DB token owner is treated as invalid.
      await revokeRefreshToken(refreshTokenHash);
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const user = await findUserById(existingRefreshToken.userId, client);

    if (!user) {
      await revokeRefreshToken(refreshTokenHash);
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (user.accountStatus !== "ACTIVE") {
      // Inactive accounts lose every active refresh token immediately.
      await revokeAllActiveRefreshTokens(user.id);
      throw createError("Account is not active", 403, "ACCOUNT_INACTIVE");
    }

    await revokeRefreshToken(refreshTokenHash, client);
    await writeAuthAudit(
      {
        userId: user.id,
        eventType: AUTH_AUDIT_EVENTS.refreshSuccess,
        requestMeta,
      },
      client,
    );
    return createAuthResponse(user, "Session refreshed", client);
  });
}

export async function logoutUser({ refreshToken, requestMeta = {} }) {
  // Logout is idempotent from the browser perspective; revoking an already
  // revoked/missing token still returns success through the controller path.
  const revokedToken = await revokeRefreshToken(hashToken(refreshToken));

  await writeAuthAudit({
    userId: revokedToken?.userId,
    eventType: AUTH_AUDIT_EVENTS.logout,
    requestMeta,
  });

  return {
    success: true,
    message: "Logged out successfully",
  };
}

export async function logoutAllUser({ user, requestMeta = {} }) {
  await revokeAllActiveRefreshTokens(user.id);
  await writeAuthAudit({
    userId: user.id,
    eventType: AUTH_AUDIT_EVENTS.logoutAll,
    requestMeta,
  });

  return {
    success: true,
    message: "Logged out from all devices successfully",
  };
}

export async function requestPasswordReset(payload, requestMeta = {}) {
  const email = payload.email.toLowerCase();
  const user = await findUserByEmail(email);

  await writeAuthAudit({
    userId: user?.id,
    eventType: AUTH_AUDIT_EVENTS.passwordForgotRequested,
    requestMeta,
    metadata: { hasAccount: Boolean(user) },
  });

  // OAuth users have verified email identities but no local password yet.
  // Allow them to receive a reset link so they can set their first password.
  if (!user?.email || user.accountStatus !== "ACTIVE") {
    return PASSWORD_FORGOT_RESPONSE;
  }

  const token = generateSecurityToken();
  const tokenHash = hashToken(token);
  const expiresAt = expiresInMinutes(env.passwordResetExpiryMinutes);

  await createPasswordResetToken({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const resetUrl = buildFrontendUrl("/reset-password", token);

  try {
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      expiresInMinutes: env.passwordResetExpiryMinutes,
    });
  } catch (error) {
    await writeAuthAudit({
      userId: user.id,
      eventType: AUTH_AUDIT_EVENTS.passwordForgotRequested,
      requestMeta,
      metadata: { deliveryFailed: true, errorCode: error.code },
    });
  }

  return PASSWORD_FORGOT_RESPONSE;
}

export async function resetPassword(payload, requestMeta = {}) {
  const tokenHash = hashToken(payload.token);

  return withTransaction(async (client) => {
    const resetToken = await findPasswordResetTokenByHash(tokenHash, client);

    if (!resetToken || resetToken.consumedAt || isExpired(resetToken.expiresAt)) {
      throw createError(
        "Invalid or expired reset token",
        400,
        "INVALID_PASSWORD_RESET_TOKEN",
      );
    }

    const user = await findUserById(resetToken.userId, client);

    if (!user || user.accountStatus !== "ACTIVE") {
      throw createError(
        "Invalid or expired reset token",
        400,
        "INVALID_PASSWORD_RESET_TOKEN",
      );
    }

    if (user.passwordHash && await bcrypt.compare(payload.newPassword, user.passwordHash)) {
      throw createError(
        "Choose a password that is different from your current password",
        400,
        "PASSWORD_REUSED",
      );
    }

    await updateUserPasswordHash(user.id, await hashSecret(payload.newPassword), client);
    await consumePasswordResetToken(resetToken.id, client);
    await revokeAllActiveRefreshTokens(user.id, client);
    await writeAuthAudit(
      {
        userId: user.id,
        eventType: AUTH_AUDIT_EVENTS.passwordResetSuccess,
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: "Password reset successfully. Please sign in again.",
    };
  });
}

export async function changePassword(
  { user, currentPassword, newPassword, currentRefreshToken },
  requestMeta = {},
) {
  return withTransaction(async (client) => {
    const fullUser = await findUserById(user.id, client);

    if (!fullUser?.passwordHash) {
      throw createError(
        "Password change is available only for password-based accounts",
        403,
        "PASSWORD_LOGIN_REQUIRED",
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      fullUser.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw createError("Current password is incorrect", 401, "INVALID_PASSWORD");
    }

    if (await bcrypt.compare(newPassword, fullUser.passwordHash)) {
      throw createError(
        "Choose a password that is different from your current password",
        400,
        "PASSWORD_REUSED",
      );
    }

    await updateUserPasswordHash(fullUser.id, await hashSecret(newPassword), client);

    if (currentRefreshToken) {
      await revokeAllActiveRefreshTokensExcept(
        fullUser.id,
        hashToken(currentRefreshToken),
        client,
      );
    } else {
      await revokeAllActiveRefreshTokens(fullUser.id, client);
    }

    await writeAuthAudit(
      {
        userId: fullUser.id,
        eventType: AUTH_AUDIT_EVENTS.passwordChangeSuccess,
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: currentRefreshToken
        ? "Password changed successfully"
        : "Password changed successfully. Please sign in again.",
    };
  });
}

export async function sendEmailVerification({ user }, requestMeta = {}) {
  const fullUser = await findUserById(user.id);

  if (!fullUser?.email) {
    throw createError("Email address is required", 400, "EMAIL_REQUIRED");
  }

  if (fullUser.isEmailVerified) {
    return {
      success: true,
      message: "Email is already verified",
    };
  }

  const token = generateSecurityToken();
  const tokenHash = hashToken(token);
  const expiresAt = expiresInHours(env.emailVerificationExpiryHours);

  await createEmailVerificationToken({
    userId: fullUser.id,
    tokenHash,
    expiresAt,
  });

  const verificationUrl = buildFrontendUrl("/verify-email", token);

  await sendEmailVerificationEmail({
    to: fullUser.email,
    verificationUrl,
    expiresInHours: env.emailVerificationExpiryHours,
  });

  await writeAuthAudit({
    userId: fullUser.id,
    eventType: AUTH_AUDIT_EVENTS.emailVerificationSent,
    requestMeta,
  });

  return {
    success: true,
    message: "Verification email sent",
    data: {
      expiresInHours: env.emailVerificationExpiryHours,
    },
  };
}

export async function verifyEmail(payload, requestMeta = {}) {
  const tokenHash = hashToken(payload.token);

  return withTransaction(async (client) => {
    const verificationToken = await findEmailVerificationTokenByHash(
      tokenHash,
      client,
    );

    if (
      !verificationToken ||
      verificationToken.consumedAt ||
      isExpired(verificationToken.expiresAt)
    ) {
      throw createError(
        "Invalid or expired verification token",
        400,
        "INVALID_EMAIL_VERIFICATION_TOKEN",
      );
    }

    const user = await markUserEmailVerified(verificationToken.userId, client);
    await consumeEmailVerificationToken(verificationToken.id, client);
    await writeAuthAudit(
      {
        userId: user.id,
        eventType: AUTH_AUDIT_EVENTS.emailVerified,
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: "Email verified successfully",
      data: {
        user: sanitizeUser(user),
      },
    };
  });
}

export async function sendLoginOtp(payload, requestMeta = {}) {
  // Return a generic success when the phone is unknown to prevent account
  // enumeration through OTP requests.
  const phone = normalizePhone(payload.phone);

  if (!(await findUserByPhone(phone))) {
    return {
      success: true,
      message: "If an account exists, an OTP will be sent.",
      data: {
        configured: env.otpProvider === "mock",
        expiresInMinutes: env.otpExpiryMinutes,
        resendCooldownSeconds: env.otpResendCooldownSeconds,
      },
    };
  }

  return createAndSendOtp({ phone, purpose: OTP_PURPOSES.login, requestMeta });
}

export async function verifyLoginOtp(payload, requestMeta = {}) {
  // Existing account lookup happens before OTP verification, but failures remain
  // generic to avoid leaking account existence.
  const phone = normalizePhone(payload.phone);
  const user = await findUserByPhone(phone);

  if (!user) {
    throw createError("Invalid or expired OTP", 400, "INVALID_OTP");
  }

  try {
    await verifyOtp({ phone, otp: payload.otp, purpose: OTP_PURPOSES.login });
  } catch (error) {
    await writeAuthAudit({
      userId: user.id,
      eventType: AUTH_AUDIT_EVENTS.otpFailed,
      requestMeta,
      metadata: { purpose: OTP_PURPOSES.login },
    });
    throw error;
  }

  await writeAuthAudit({
    userId: user.id,
    eventType: AUTH_AUDIT_EVENTS.loginSuccess,
    requestMeta,
    metadata: { method: "otp" },
  });
  return createAuthResponse(user, "OTP login successful");
}

export async function sendRegisterOtp(payload, requestMeta = {}) {
  // Registration OTP send rejects existing phones so duplicate accounts cannot
  // be created through the OTP flow.
  const phone = normalizePhone(payload.phone);

  if (await findUserByPhone(phone)) {
    throw createError("Account already exists", 409, "ACCOUNT_EXISTS");
  }

  return createAndSendOtp({ phone, purpose: OTP_PURPOSES.register, requestMeta });
}

export async function verifyRegisterOtp(payload) {
  // Verify OTP and create the phone account in one transaction to prevent races
  // between OTP use and account creation.
  const phone = normalizePhone(payload.phone);

  return withTransaction(async (client) => {
    await ensureUniqueIdentity({ phone }, client);
    await verifyOtp({
      phone,
      otp: payload.otp,
      purpose: OTP_PURPOSES.register,
      client,
    });

    let user;

    try {
      user = await createUser(
        {
          fullName: payload.fullName,
          email: null,
          phone,
          passwordHash: null,
          role: toRole(payload.role),
          authProvider: "PHONE",
          isEmailVerified: false,
          isPhoneVerified: true,
        },
        client,
      );
    } catch (error) {
      if (error.code === "23505") {
        throw createError("Account already exists", 409, "ACCOUNT_EXISTS");
      }

      throw error;
    }

    return createAuthResponse(user, "Account registered successfully", client);
  });
}

export async function loginWithGoogle(payload, requestMeta = {}) {
  // Provider module verifies token authenticity before shared OAuth login logic.
  const profile = await verifyGoogleIdToken(payload.idToken);
  return loginWithOAuthProfile(profile, requestMeta);
}

export async function registerWithGoogle(payload, requestMeta = {}) {
  // Provider profile plus requested role are handled by shared OAuth registration.
  const profile = await verifyGoogleIdToken(payload.idToken);
  return registerWithOAuthProfile(profile, payload.role, requestMeta);
}

export async function loginWithFacebook(payload, requestMeta = {}) {
  // Facebook access token must be validated server-side before account lookup.
  const profile = await verifyFacebookAccessToken(payload.accessToken);
  return loginWithOAuthProfile(profile, requestMeta);
}

export async function registerWithFacebook(payload, requestMeta = {}) {
  // Facebook registration follows the same role and uniqueness rules as Google.
  const profile = await verifyFacebookAccessToken(payload.accessToken);
  return registerWithOAuthProfile(profile, payload.role, requestMeta);
}

async function loginWithOAuthProfile(profile, requestMeta = {}) {
  // Prefer exact provider-subject link. If not linked yet, a verified email match
  // can attach the provider to an existing account.
  return withTransaction(async (client) => {
    const linkedUser = await findOAuthAccount(
      profile.provider,
      profile.providerSubject,
      client,
    );

    if (linkedUser) {
      await writeAuthAudit(
        {
          userId: linkedUser.id,
          eventType: AUTH_AUDIT_EVENTS.oauthLoginSuccess,
          requestMeta,
          metadata: { provider: profile.provider },
        },
        client,
      );
      return createAuthResponse(linkedUser, "Login successful", client);
    }

    const emailUser = await findUserByEmail(profile.email, client);

    if (emailUser) {
      // Link provider on first social login only after provider email verification.
      await linkOAuthAccount(
        {
          userId: emailUser.id,
          provider: profile.provider,
          providerSubject: profile.providerSubject,
          email: profile.email,
        },
        client,
      );
      await writeAuthAudit(
        {
          userId: emailUser.id,
          eventType: AUTH_AUDIT_EVENTS.oauthLinked,
          requestMeta,
          metadata: { provider: profile.provider },
        },
        client,
      );
      await writeAuthAudit(
        {
          userId: emailUser.id,
          eventType: AUTH_AUDIT_EVENTS.oauthLoginSuccess,
          requestMeta,
          metadata: { provider: profile.provider },
        },
        client,
      );
      return createAuthResponse(emailUser, "Login successful", client);
    }

    throw createError("Account does not exist", 404, "ACCOUNT_NOT_FOUND");
  });
}

export async function sendPhoneVerification(payload, user, requestMeta = {}) {
  const phone = normalizePhone(payload.phone || user.phone || "");

  if (!phone) {
    throw createError("Phone number is required", 400, "PHONE_REQUIRED");
  }

  const existingUser = await findUserByPhone(phone);

  if (existingUser && existingUser.id !== user.id) {
    throw createError("Phone number cannot be used", 409, "PHONE_UNAVAILABLE");
  }

  const result = await createAndSendOtp({
    phone,
    purpose: OTP_PURPOSES.phoneVerify,
    requestMeta,
  });

  await writeAuthAudit({
    userId: user.id,
    eventType: AUTH_AUDIT_EVENTS.phoneOtpSent,
    requestMeta,
  });

  return {
    ...result,
    message: "Verification OTP sent",
  };
}

export async function verifyPhone(payload, user, requestMeta = {}) {
  const phone = normalizePhone(payload.phone);

  return withTransaction(async (client) => {
    const existingUser = await findUserByPhone(phone, client);

    if (existingUser && existingUser.id !== user.id) {
      throw createError("Phone number cannot be used", 409, "PHONE_UNAVAILABLE");
    }

    try {
      await verifyOtp({
        phone,
        otp: payload.otp,
        purpose: OTP_PURPOSES.phoneVerify,
        client,
      });
    } catch (error) {
      await writeAuthAudit({
        userId: user.id,
        eventType: AUTH_AUDIT_EVENTS.otpFailed,
        requestMeta,
        metadata: { purpose: OTP_PURPOSES.phoneVerify },
      });
      throw error;
    }

    const updatedUser = await updateUserPhoneVerified(user.id, phone, client);
    await writeAuthAudit(
      {
        userId: user.id,
        eventType: AUTH_AUDIT_EVENTS.phoneVerified,
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: "Phone verified successfully",
      data: {
        user: sanitizeUser(updatedUser),
      },
    };
  });
}

async function registerWithOAuthProfile(profile, role, requestMeta = {}) {
  // OAuth registration creates a new account only when the provider identity and
  // verified email are not already associated with GoldWallah.
  const requestedRole = toRole(role);

  return withTransaction(async (client) => {
    const linkedUser = await findOAuthAccount(
      profile.provider,
      profile.providerSubject,
      client,
    );

    if (linkedUser) {
      // If the provider identity already exists, only allow login when the user
      // selected the same account role.
      if (linkedUser.role !== requestedRole) {
        throw createError(
          "This social account is already registered with a different role. Sign in to the existing account or use a different verified social identity.",
          409,
          "OAUTH_ROLE_CONFLICT",
        );
      }

      await writeAuthAudit(
        {
          userId: linkedUser.id,
          eventType: AUTH_AUDIT_EVENTS.oauthLoginSuccess,
          requestMeta,
          metadata: { provider: profile.provider },
        },
        client,
      );
      return createAuthResponse(linkedUser, "Login successful", client);
    }

    const existingEmailUser = await findUserByEmail(profile.email, client);

    if (existingEmailUser) {
      // Do not auto-link during registration; users must sign in to connect an
      // existing account deliberately.
      throw createError(
        "An account already exists for this email. Sign in instead to continue with this social account.",
        409,
        "ACCOUNT_EXISTS",
      );
    }

    // Create user and provider link in one transaction so no orphan OAuth link
    // or duplicate user can be left behind.
    const user = await createUser(
      {
        fullName: profile.fullName,
        email: profile.email,
        phone: null,
        passwordHash: null,
        role: requestedRole,
        authProvider: profile.provider,
        isEmailVerified: profile.isEmailVerified,
        isPhoneVerified: false,
      },
      client,
    );

    await linkOAuthAccount(
      {
        userId: user.id,
        provider: profile.provider,
        providerSubject: profile.providerSubject,
        email: profile.email,
      },
      client,
    );

    await writeAuthAudit(
      {
        userId: user.id,
        eventType: AUTH_AUDIT_EVENTS.registerSuccess,
        requestMeta,
        metadata: { method: "oauth", provider: profile.provider },
      },
      client,
    );

    return createAuthResponse(user, "Account registered successfully", client);
  });
}
