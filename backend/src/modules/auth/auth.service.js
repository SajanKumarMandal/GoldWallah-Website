import { createHash, randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { withTransaction } from "../../config/db.js";
import { env } from "../../config/env.js";
import { verifyFacebookAccessToken } from "./providers/facebookAuth.provider.js";
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
  findLatestActiveOtp,
  findOAuthAccount,
  findRefreshTokenByHash,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  incrementOtpAttempts,
  linkOAuthAccount,
  consumeOtp,
  revokeAllActiveRefreshTokens,
  revokeRefreshToken,
  saveRefreshToken,
  sanitizeUser,
} from "./auth.repository.js";
import { AUTH_ROLES, normalizePhone } from "./auth.validation.js";

// User authentication service: owns registration/login, OTP verification,
// access-token creation, and refresh-token rotation/reuse handling.
const OTP_PURPOSES = {
  login: "LOGIN",
  register: "REGISTER",
};
const REFRESH_REUSE_GRACE_MS = 30 * 1000;

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

export async function registerWithEmail(payload) {
  // Email registration validates uniqueness, hashes the password, and starts the
  // user at NOT_SUBMITTED verification gates.
  const email = payload.email.toLowerCase();
  const phone = normalizePhone(payload.phone);

  await ensureUniqueIdentity({ email, phone });

  const passwordHash = await hashSecret(payload.password);
  let user;

  try {
    user = await createUser({
      fullName: payload.fullName,
      email,
      phone,
      passwordHash,
      role: toRole(payload.role),
      authProvider: "EMAIL",
      isEmailVerified: false,
      isPhoneVerified: false,
    });
  } catch (error) {
    if (error.code === "23505") {
      throw createError("Account already exists", 409, "ACCOUNT_EXISTS");
    }

    throw error;
  }

  return createAuthResponse(user, "Account registered successfully");
}

export async function loginWithEmail(payload) {
  // Use a single public error for missing users and password mismatch to avoid
  // account enumeration.
  const email = payload.email.toLowerCase();
  const user = await findUserByEmail(email);
  const invalidLoginError = createError(
    "Invalid email or password",
    401,
    "INVALID_CREDENTIALS",
  );

  if (!user?.passwordHash) {
    throw invalidLoginError;
  }

  const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);

  if (!isPasswordValid) {
    throw invalidLoginError;
  }

  return createAuthResponse(user, "Login successful");
}

export async function refreshUserSession({ refreshToken }) {
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

      await revokeAllActiveRefreshTokens(existingRefreshToken.userId, client);
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (new Date(existingRefreshToken.expiresAt).getTime() <= Date.now()) {
      // Expired refresh tokens are revoked so future attempts are tracked.
      await revokeRefreshToken(refreshTokenHash, client);
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const payload = verifyRefreshToken(refreshToken);

    if (payload.sub !== existingRefreshToken.userId) {
      // A valid JWT paired with a different DB token owner is treated as invalid.
      await revokeRefreshToken(refreshTokenHash, client);
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const user = await findUserById(existingRefreshToken.userId, client);

    if (!user) {
      await revokeRefreshToken(refreshTokenHash, client);
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (user.accountStatus !== "ACTIVE") {
      // Inactive accounts lose every active refresh token immediately.
      await revokeAllActiveRefreshTokens(user.id, client);
      throw createError("Account is not active", 403, "ACCOUNT_INACTIVE");
    }

    await revokeRefreshToken(refreshTokenHash, client);
    return createAuthResponse(user, "Session refreshed", client);
  });
}

export async function logoutUser({ refreshToken }) {
  // Logout is idempotent from the browser perspective; revoking an already
  // revoked/missing token still returns success through the controller path.
  await revokeRefreshToken(hashToken(refreshToken));

  return {
    success: true,
    message: "Logged out successfully",
  };
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

export async function verifyLoginOtp(payload) {
  // Existing account lookup happens before OTP verification, but failures remain
  // generic to avoid leaking account existence.
  const phone = normalizePhone(payload.phone);
  const user = await findUserByPhone(phone);

  if (!user) {
    throw createError("Invalid or expired OTP", 400, "INVALID_OTP");
  }

  await verifyOtp({ phone, otp: payload.otp, purpose: OTP_PURPOSES.login });
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

export async function loginWithGoogle(payload) {
  // Provider module verifies token authenticity before shared OAuth login logic.
  const profile = await verifyGoogleIdToken(payload.idToken);
  return loginWithOAuthProfile(profile);
}

export async function registerWithGoogle(payload) {
  // Provider profile plus requested role are handled by shared OAuth registration.
  const profile = await verifyGoogleIdToken(payload.idToken);
  return registerWithOAuthProfile(profile, payload.role);
}

export async function loginWithFacebook(payload) {
  // Facebook access token must be validated server-side before account lookup.
  const profile = await verifyFacebookAccessToken(payload.accessToken);
  return loginWithOAuthProfile(profile);
}

export async function registerWithFacebook(payload) {
  // Facebook registration follows the same role and uniqueness rules as Google.
  const profile = await verifyFacebookAccessToken(payload.accessToken);
  return registerWithOAuthProfile(profile, payload.role);
}

async function loginWithOAuthProfile(profile) {
  // Prefer exact provider-subject link. If not linked yet, a verified email match
  // can attach the provider to an existing account.
  const linkedUser = await findOAuthAccount(
    profile.provider,
    profile.providerSubject,
  );

  if (linkedUser) {
    return createAuthResponse(linkedUser, "Login successful");
  }

  const emailUser = await findUserByEmail(profile.email);

  if (emailUser) {
    // Link provider on first social login only after provider email verification.
    await linkOAuthAccount({
      userId: emailUser.id,
      provider: profile.provider,
      providerSubject: profile.providerSubject,
      email: profile.email,
    });
    return createAuthResponse(emailUser, "Login successful");
  }

  throw createError("Account does not exist", 404, "ACCOUNT_NOT_FOUND");
}

async function registerWithOAuthProfile(profile, role) {
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

    return createAuthResponse(user, "Account registered successfully", client);
  });
}
