import { createHash, createHmac } from "node:crypto";

import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { createAuthAuditLog } from "./auth.repository.js";

const SENSITIVE_METADATA_KEYS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "token",
  "otp",
  "accessToken",
  "refreshToken",
  "idToken",
]);

export const AUTH_AUDIT_EVENTS = {
  registerSuccess: "REGISTER_SUCCESS",
  loginSuccess: "LOGIN_SUCCESS",
  loginFailed: "LOGIN_FAILED",
  logout: "LOGOUT",
  logoutAll: "LOGOUT_ALL",
  refreshSuccess: "REFRESH_SUCCESS",
  refreshFailed: "REFRESH_FAILED",
  passwordForgotRequested: "PASSWORD_FORGOT_REQUESTED",
  passwordResetSuccess: "PASSWORD_RESET_SUCCESS",
  passwordChangeSuccess: "PASSWORD_CHANGE_SUCCESS",
  emailVerificationSent: "EMAIL_VERIFICATION_SENT",
  emailVerified: "EMAIL_VERIFIED",
  phoneOtpSent: "PHONE_OTP_SENT",
  phoneVerified: "PHONE_VERIFIED",
  otpFailed: "OTP_FAILED",
  oauthLoginSuccess: "OAUTH_LOGIN_SUCCESS",
  oauthLinked: "OAUTH_LINKED",
  tokenReuseDetected: "TOKEN_REUSE_DETECTED",
};

function hashIp(ipAddress) {
  const value = typeof ipAddress === "string" ? ipAddress.trim() : "";

  if (!value) {
    return "";
  }

  const secret = env.kycIdentityHashSecret || env.jwtAccessSecret;

  if (secret) {
    return createHmac("sha256", secret).update(value).digest("hex");
  }

  return createHash("sha256").update(value).digest("hex");
}

function sanitizeMetadata(metadata = {}) {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([key]) => !SENSITIVE_METADATA_KEYS.has(key))
      .map(([key, value]) => [
        key,
        typeof value === "string" && value.length > 500
          ? `${value.slice(0, 500)}...`
          : value,
      ]),
  );
}

export async function writeAuthAudit(
  { userId, eventType, requestMeta = {}, metadata = {} },
  client,
) {
  try {
    await createAuthAuditLog(
      {
        userId,
        eventType,
        ipHash: hashIp(requestMeta.ip),
        userAgent: requestMeta.userAgent || null,
        metadata: sanitizeMetadata(metadata),
      },
      client,
    );
  } catch (error) {
    logger.warn({ error, eventType }, "Auth audit write failed");
  }
}

