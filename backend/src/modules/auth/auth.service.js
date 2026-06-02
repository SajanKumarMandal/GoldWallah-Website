import { createHash, randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { withTransaction } from "../../config/db.js";
import { env } from "../../config/env.js";
import { verifyFacebookAccessToken } from "./providers/facebookAuth.provider.js";
import { verifyGoogleIdToken } from "./providers/googleAuth.provider.js";
import { generateOtp, sendOtp } from "./providers/otp.provider.js";
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
import { normalizePhone } from "./auth.validation.js";

// User authentication service: owns registration/login, OTP verification,
// access-token creation, and refresh-token rotation/reuse handling.
const OTP_PURPOSES = {
  login: "LOGIN",
  register: "REGISTER",
};
const REFRESH_REUSE_GRACE_MS = 30 * 1000;

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function toRole(role) {
  return role.toUpperCase();
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function getTokenExpiry(token) {
  const decoded = jwt.decode(token);

  if (!decoded?.exp) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  return new Date(decoded.exp * 1000).toISOString();
}

function isRecentlyRevoked(refreshTokenRecord) {
  if (!refreshTokenRecord?.revokedAt) {
    return false;
  }

  const revokedAtMs = new Date(refreshTokenRecord.revokedAt).getTime();

  return Number.isFinite(revokedAtMs) && Date.now() - revokedAtMs <= REFRESH_REUSE_GRACE_MS;
}

async function createAuthResponse(user, message, client) {
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
  if (email && (await findUserByEmail(email, client))) {
    throw createError("Account already exists", 409, "ACCOUNT_EXISTS");
  }

  if (phone && (await findUserByPhone(phone, client))) {
    throw createError("Account already exists", 409, "ACCOUNT_EXISTS");
  }
}

async function hashSecret(secret) {
  return bcrypt.hash(secret, env.bcryptSaltRounds);
}

async function verifyOtp({ phone, otp, purpose, client }) {
  const otpRecord = await findLatestActiveOtp(phone, purpose, client);

  if (!otpRecord) {
    throw createError("Invalid or expired OTP", 400, "INVALID_OTP");
  }

  if (otpRecord.attempts >= 5) {
    throw createError("Invalid or expired OTP", 400, "OTP_ATTEMPTS_EXCEEDED");
  }

  const isDevelopmentMockOtp =
    !env.isProduction && env.otpProvider === "mock" && otp === "123456";
  const isMatch = isDevelopmentMockOtp || (await bcrypt.compare(otp, otpRecord.otpHash));

  if (!isMatch) {
    await incrementOtpAttempts(otpRecord.id, client);
    throw createError("Invalid or expired OTP", 400, "INVALID_OTP");
  }

  await consumeOtp(otpRecord.id, client);
}

async function createAndSendOtp({ phone, purpose }) {
  const existingOtp = await findLatestActiveOtp(phone, purpose);
  const cooldownMs = env.otpResendCooldownSeconds * 1000;

  if (
    existingOtp &&
    Date.now() - new Date(existingOtp.createdAt).getTime() < cooldownMs
  ) {
    throw createError("Please wait before requesting another OTP", 429, "OTP_COOLDOWN");
  }

  const otp = generateOtp();
  const otpHash = await hashSecret(otp);
  const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000).toISOString();

  const providerResult = await sendOtp({ phone, otp });

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
      if (isRecentlyRevoked(existingRefreshToken)) {
        throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
      }

      await revokeAllActiveRefreshTokens(existingRefreshToken.userId, client);
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    if (new Date(existingRefreshToken.expiresAt).getTime() <= Date.now()) {
      await revokeRefreshToken(refreshTokenHash, client);
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const payload = verifyRefreshToken(refreshToken);

    if (payload.sub !== existingRefreshToken.userId) {
      await revokeRefreshToken(refreshTokenHash, client);
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const user = await findUserById(existingRefreshToken.userId, client);

    if (!user) {
      await revokeRefreshToken(refreshTokenHash, client);
      throw createError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    await revokeRefreshToken(refreshTokenHash, client);
    return createAuthResponse(user, "Session refreshed", client);
  });
}

export async function logoutUser({ refreshToken }) {
  await revokeRefreshToken(hashToken(refreshToken));

  return {
    success: true,
    message: "Logged out successfully",
  };
}

export async function sendLoginOtp(payload) {
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

  return createAndSendOtp({ phone, purpose: OTP_PURPOSES.login });
}

export async function verifyLoginOtp(payload) {
  const phone = normalizePhone(payload.phone);
  const user = await findUserByPhone(phone);

  if (!user) {
    throw createError("Invalid or expired OTP", 400, "INVALID_OTP");
  }

  await verifyOtp({ phone, otp: payload.otp, purpose: OTP_PURPOSES.login });
  return createAuthResponse(user, "OTP login successful");
}

export async function sendRegisterOtp(payload) {
  const phone = normalizePhone(payload.phone);

  if (await findUserByPhone(phone)) {
    throw createError("Account already exists", 409, "ACCOUNT_EXISTS");
  }

  return createAndSendOtp({ phone, purpose: OTP_PURPOSES.register });
}

export async function verifyRegisterOtp(payload) {
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
  const profile = await verifyGoogleIdToken(payload.idToken);
  return loginWithOAuthProfile(profile);
}

export async function registerWithGoogle(payload) {
  const profile = await verifyGoogleIdToken(payload.idToken);
  return registerWithOAuthProfile(profile, payload.role);
}

export async function loginWithFacebook(payload) {
  const profile = await verifyFacebookAccessToken(payload.accessToken);
  return loginWithOAuthProfile(profile);
}

export async function registerWithFacebook(payload) {
  const profile = await verifyFacebookAccessToken(payload.accessToken);
  return registerWithOAuthProfile(profile, payload.role);
}

async function loginWithOAuthProfile(profile) {
  const linkedUser = await findOAuthAccount(
    profile.provider,
    profile.providerSubject,
  );

  if (linkedUser) {
    return createAuthResponse(linkedUser, "Login successful");
  }

  const emailUser = await findUserByEmail(profile.email);

  if (emailUser) {
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
  return withTransaction(async (client) => {
    const linkedUser = await findOAuthAccount(
      profile.provider,
      profile.providerSubject,
      client,
    );

    if (linkedUser) {
      return createAuthResponse(linkedUser, "Login successful", client);
    }

    let user = await findUserByEmail(profile.email, client);

    if (!user) {
      user = await createUser(
        {
          fullName: profile.fullName,
          email: profile.email,
          phone: null,
          passwordHash: null,
          role: toRole(role),
          authProvider: profile.provider,
          isEmailVerified: profile.isEmailVerified,
          isPhoneVerified: false,
        },
        client,
      );
    }

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
