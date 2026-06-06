import * as authService from "./auth.service.js";
import { env } from "../../config/env.js";
import {
  facebookLoginSchema,
  facebookRegisterSchema,
  googleLoginSchema,
  googleRegisterSchema,
  loginSchema,
  logoutSchema,
  registerSchema,
  refreshSchema,
  sendOtpSchema,
  validateBody,
  verifyLoginOtpSchema,
  verifyRegisterOtpSchema,
} from "./auth.validation.js";

const refreshCookieName = "goldwallah_refresh_token";

function requestOrigin(request) {
  const forwardedProto = request.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || request.protocol;
  const host = forwardedHost || request.get("host");

  return `${protocol}://${host}`;
}

function isCrossSiteFrontend(request) {
  try {
    const frontendOrigin = new URL(env.frontendOrigin).origin;

    return frontendOrigin !== requestOrigin(request);
  } catch {
    return true;
  }
}

function sendSuccess(response, result, statusCode = 200) {
  response.status(statusCode).json(result);
}

function refreshCookieOptions(request) {
  const useCrossSiteCookie = env.isProduction && isCrossSiteFrontend(request);
  const options = {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: useCrossSiteCookie ? "none" : "lax",
    path: `/api/${request.app.locals.apiVersion || "v1"}/auth`,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  if (env.authCookieDomain) {
    options.domain = env.authCookieDomain;
  }

  return options;
}

function createRequestOriginError() {
  const error = new Error("Invalid request origin");
  error.statusCode = 403;
  error.code = "UNTRUSTED_ORIGIN";
  return error;
}

function createInvalidRefreshTokenError() {
  const error = new Error("Invalid refresh token");
  error.statusCode = 401;
  error.code = "INVALID_REFRESH_TOKEN";
  return error;
}

function assertTrustedBrowserOrigin(request) {
  const origin = request.get("origin");
  const secFetchSite = request.get("sec-fetch-site");
  const csrfHeader = request.get("x-csrf-token");

  if (!origin) {
    if (["cross-site", "same-site"].includes(secFetchSite)) {
      throw createRequestOriginError();
    }

    return;
  }

  let normalizedOrigin;
  let normalizedFrontendOrigin;

  try {
    normalizedOrigin = new URL(origin).origin;
    normalizedFrontendOrigin = new URL(env.frontendOrigin).origin;
  } catch {
    throw createRequestOriginError();
  }

  if (normalizedOrigin !== normalizedFrontendOrigin) {
    throw createRequestOriginError();
  }

  if (request.method !== "GET" && !csrfHeader) {
    const error = new Error("Missing CSRF protection header");
    error.statusCode = 403;
    error.code = "CSRF_HEADER_REQUIRED";
    throw error;
  }
}

function readCookie(request, name) {
  const cookieHeader = request.get("cookie") || "";
  const cookies = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean);

  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.split("=");

    if (cookieName === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return "";
}

function otpAuditMeta(request, payload, event) {
  return {
    event,
    phone: payload?.phone || null,
    ipAddress: request.ip || null,
    userAgent: request.get("user-agent") || null,
    requestId: request.requestId || request.id || null,
  };
}

function logOtpAudit(request, payload, event, level = "info", extra = {}) {
  request.log?.[level]?.({ ...otpAuditMeta(request, payload, event), ...extra }, event);
}

function sendAuthSuccess(request, response, result, statusCode = 200) {
  const refreshToken = result?.data?.refreshToken;

  if (refreshToken) {
    response.cookie(refreshCookieName, refreshToken, refreshCookieOptions(request));
  }

  const responseBody = {
    ...result,
    data: {
      ...result.data,
      refreshToken: undefined,
    },
  };

  sendSuccess(response, responseBody, statusCode);
}

function clearRefreshCookie(request, response) {
  const clearOptions = { ...refreshCookieOptions(request) };
  delete clearOptions.maxAge;

  response.clearCookie(refreshCookieName, clearOptions);
}

export async function register(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(registerSchema, request.body);
    sendAuthSuccess(
      request,
      response,
      await authService.registerWithEmail(payload),
      201,
    );
  } catch (error) {
    next(error);
  }
}

export async function login(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(loginSchema, request.body);
    sendAuthSuccess(request, response, await authService.loginWithEmail(payload));
  } catch (error) {
    next(error);
  }
}

export async function refresh(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const refreshToken = readCookie(request, refreshCookieName);

    if (!refreshToken) {
      throw createInvalidRefreshTokenError();
    }

    const payload = validateBody(refreshSchema, { refreshToken });
    sendAuthSuccess(
      request,
      response,
      await authService.refreshUserSession({
        refreshToken: payload.refreshToken,
      }),
    );
  } catch (error) {
    clearRefreshCookie(request, response);
    next(error);
  }
}

export async function logout(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const refreshToken = readCookie(request, refreshCookieName);
    clearRefreshCookie(request, response);

    if (!refreshToken) {
      sendSuccess(response, {
        success: true,
        message: "Logged out successfully",
      });
      return;
    }

    const payload = validateBody(logoutSchema, { refreshToken });
    sendSuccess(
      response,
      await authService.logoutUser({
        refreshToken: payload.refreshToken,
      }),
    );
  } catch (error) {
    clearRefreshCookie(request, response);
    next(error);
  }
}

export async function sendLoginOtp(request, response, next) {
  let payload;

  try {
    assertTrustedBrowserOrigin(request);
    payload = validateBody(sendOtpSchema, request.body);
    logOtpAudit(request, payload, "OTP_LOGIN_SEND_REQUESTED");
    const result = await authService.sendLoginOtp(payload);
    logOtpAudit(request, payload, "OTP_LOGIN_SEND_SUCCEEDED", "info", {
      configured: result?.data?.configured,
    });
    sendSuccess(response, result);
  } catch (error) {
    logOtpAudit(request, payload, "OTP_LOGIN_SEND_FAILED", "warn", {
      errorCode: error.code || null,
    });
    next(error);
  }
}

export async function verifyLoginOtp(request, response, next) {
  let payload;

  try {
    assertTrustedBrowserOrigin(request);
    payload = validateBody(verifyLoginOtpSchema, request.body);
    logOtpAudit(request, payload, "OTP_LOGIN_VERIFY_REQUESTED");
    const result = await authService.verifyLoginOtp(payload);
    logOtpAudit(request, payload, "OTP_LOGIN_VERIFY_SUCCEEDED");
    sendAuthSuccess(request, response, result);
  } catch (error) {
    logOtpAudit(request, payload, "OTP_LOGIN_VERIFY_FAILED", "warn", {
      errorCode: error.code || null,
    });
    next(error);
  }
}

export async function sendRegisterOtp(request, response, next) {
  let payload;

  try {
    assertTrustedBrowserOrigin(request);
    payload = validateBody(sendOtpSchema, request.body);
    logOtpAudit(request, payload, "OTP_REGISTER_SEND_REQUESTED");
    const result = await authService.sendRegisterOtp(payload);
    logOtpAudit(request, payload, "OTP_REGISTER_SEND_SUCCEEDED", "info", {
      configured: result?.data?.configured,
    });
    sendSuccess(response, result);
  } catch (error) {
    logOtpAudit(request, payload, "OTP_REGISTER_SEND_FAILED", "warn", {
      errorCode: error.code || null,
    });
    next(error);
  }
}

export async function verifyRegisterOtp(request, response, next) {
  let payload;

  try {
    assertTrustedBrowserOrigin(request);
    payload = validateBody(verifyRegisterOtpSchema, request.body);
    logOtpAudit(request, payload, "OTP_REGISTER_VERIFY_REQUESTED");
    const result = await authService.verifyRegisterOtp(payload);
    logOtpAudit(request, payload, "OTP_REGISTER_VERIFY_SUCCEEDED");
    sendAuthSuccess(request, response, result, 201);
  } catch (error) {
    logOtpAudit(request, payload, "OTP_REGISTER_VERIFY_FAILED", "warn", {
      errorCode: error.code || null,
    });
    next(error);
  }
}

export async function googleLogin(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(googleLoginSchema, request.body);
    sendAuthSuccess(request, response, await authService.loginWithGoogle(payload));
  } catch (error) {
    next(error);
  }
}

export async function googleRegister(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(googleRegisterSchema, request.body);
    sendAuthSuccess(
      request,
      response,
      await authService.registerWithGoogle(payload),
      201,
    );
  } catch (error) {
    next(error);
  }
}

export async function facebookLogin(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(facebookLoginSchema, request.body);
    sendAuthSuccess(request, response, await authService.loginWithFacebook(payload));
  } catch (error) {
    next(error);
  }
}

export async function facebookRegister(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(facebookRegisterSchema, request.body);
    sendAuthSuccess(
      request,
      response,
      await authService.registerWithFacebook(payload),
      201,
    );
  } catch (error) {
    next(error);
  }
}
