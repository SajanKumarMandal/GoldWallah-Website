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

function isCrossSiteFrontend(request) {
  try {
    const frontendOrigin = new URL(env.frontendOrigin).origin;
    const requestOrigin = `${request.protocol}://${request.get("host")}`;

    return frontendOrigin !== requestOrigin;
  } catch {
    return true;
  }
}

function sendSuccess(response, result, statusCode = 200) {
  response.status(statusCode).json(result);
}

function refreshCookieOptions(request) {
  const useCrossSiteCookie = env.isProduction && isCrossSiteFrontend(request);

  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: useCrossSiteCookie ? "none" : "lax",
    path: `/api/${request.app.locals.apiVersion || "v1"}/auth`,
  };
}

function assertTrustedBrowserOrigin(request) {
  const origin = request.get("origin");
  const secFetchSite = request.get("sec-fetch-site");
  const csrfHeader = request.get("x-csrf-token");

  if (!origin) {
    if (["cross-site", "same-site"].includes(secFetchSite)) {
      const error = new Error("Invalid request origin");
      error.statusCode = 403;
      error.code = "UNTRUSTED_ORIGIN";
      throw error;
    }

    return;
  }

  let normalizedOrigin;
  let normalizedFrontendOrigin;

  try {
    normalizedOrigin = new URL(origin).origin;
    normalizedFrontendOrigin = new URL(env.frontendOrigin).origin;
  } catch {
    const error = new Error("Invalid request origin");
    error.statusCode = 403;
    error.code = "UNTRUSTED_ORIGIN";
    throw error;
  }

  if (normalizedOrigin !== normalizedFrontendOrigin) {
    const error = new Error("Invalid request origin");
    error.statusCode = 403;
    error.code = "UNTRUSTED_ORIGIN";
    throw error;
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
  response.clearCookie(refreshCookieName, refreshCookieOptions(request));
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
    const payload = validateBody(refreshSchema, {
      refreshToken:
        request.body?.refreshToken || readCookie(request, refreshCookieName),
    });
    sendAuthSuccess(
      request,
      response,
      await authService.refreshUserSession({
        refreshToken: payload.refreshToken,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function logout(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(logoutSchema, {
      refreshToken:
        request.body?.refreshToken || readCookie(request, refreshCookieName),
    });
    clearRefreshCookie(request, response);
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
  try {
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(sendOtpSchema, request.body);
    sendSuccess(response, await authService.sendLoginOtp(payload));
  } catch (error) {
    next(error);
  }
}

export async function verifyLoginOtp(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(verifyLoginOtpSchema, request.body);
    sendAuthSuccess(request, response, await authService.verifyLoginOtp(payload));
  } catch (error) {
    next(error);
  }
}

export async function sendRegisterOtp(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(sendOtpSchema, request.body);
    sendSuccess(response, await authService.sendRegisterOtp(payload));
  } catch (error) {
    next(error);
  }
}

export async function verifyRegisterOtp(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(verifyRegisterOtpSchema, request.body);
    sendAuthSuccess(
      request,
      response,
      await authService.verifyRegisterOtp(payload),
      201,
    );
  } catch (error) {
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
