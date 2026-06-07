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
  // Reconstruct the browser-visible origin while respecting proxy headers from
  // the load balancer in production.
  const forwardedProto = request.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || request.protocol;
  const host = forwardedHost || request.get("host");

  return `${protocol}://${host}`;
}

function isCrossSiteFrontend(request) {
  // Cross-site deployments need SameSite=None refresh cookies; same-site local
  // development can use stricter SameSite=Lax cookies.
  try {
    const frontendOrigin = new URL(env.frontendOrigin).origin;

    return frontendOrigin !== requestOrigin(request);
  } catch {
    return true;
  }
}

function sendSuccess(response, result, statusCode = 200) {
  // Keep controller responses consistent after service calls finish.
  response.status(statusCode).json(result);
}

function otpRequestMeta(request) {
  return {
    ip: request.ip || request.socket?.remoteAddress || "",
  };
}

function refreshCookieOptions(request) {
  // Refresh tokens are stored only in HttpOnly cookies. JavaScript receives only
  // short-lived access tokens in response bodies.
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
  // Generic origin failure avoids leaking trusted-origin details.
  const error = new Error("Invalid request origin");
  error.statusCode = 403;
  error.code = "UNTRUSTED_ORIGIN";
  return error;
}

function createInvalidRefreshTokenError() {
  // All missing/invalid refresh-token cases share the same public error.
  const error = new Error("Invalid refresh token");
  error.statusCode = 401;
  error.code = "INVALID_REFRESH_TOKEN";
  return error;
}

function assertTrustedBrowserOrigin(request) {
  // Browser auth endpoints mutate session state, so require a trusted Origin and
  // a CSRF header for unsafe methods.
  const origin = request.get("origin");
  const secFetchSite = request.get("sec-fetch-site");
  const csrfHeader = request.get("x-csrf-token");

  if (!origin) {
    // Some non-browser clients omit Origin; Sec-Fetch-Site still catches obvious
    // cross-site browser requests.
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
  // Minimal cookie parser for this module's refresh cookie only.
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
  // Move refreshToken from the service result into an HttpOnly cookie and remove
  // it from the JSON body before sending the response.
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
  // Clear using the same cookie path/domain settings used when the cookie was set.
  const clearOptions = { ...refreshCookieOptions(request) };
  delete clearOptions.maxAge;

  response.clearCookie(refreshCookieName, clearOptions);
}

export async function register(request, response, next) {
  try {
    // Email/password registration validates browser origin and request body
    // before creating a user and issuing a session.
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
    // Email/password login returns the same auth response shape as OTP/OAuth.
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(loginSchema, request.body);
    sendAuthSuccess(request, response, await authService.loginWithEmail(payload));
  } catch (error) {
    next(error);
  }
}

export async function refresh(request, response, next) {
  try {
    // Refresh rotates the HttpOnly cookie; failures clear the cookie immediately.
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
    // Logout revokes the stored refresh token when present and always clears the
    // browser cookie.
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
  try {
    // Send login OTP after validating origin and phone format.
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(sendOtpSchema, request.body);
    sendSuccess(response, await authService.sendLoginOtp(payload, otpRequestMeta(request)));
  } catch (error) {
    next(error);
  }
}

export async function verifyLoginOtp(request, response, next) {
  try {
    // Successful OTP login issues the normal access token + refresh cookie pair.
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(verifyLoginOtpSchema, request.body);
    sendAuthSuccess(request, response, await authService.verifyLoginOtp(payload));
  } catch (error) {
    next(error);
  }
}

export async function sendRegisterOtp(request, response, next) {
  try {
    // Send registration OTP before creating any account record.
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(sendOtpSchema, request.body);
    sendSuccess(response, await authService.sendRegisterOtp(payload, otpRequestMeta(request)));
  } catch (error) {
    next(error);
  }
}

export async function verifyRegisterOtp(request, response, next) {
  try {
    // OTP registration creates the account and session only after OTP validation.
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
    // Backend validates the Google ID token before looking up/linking an account.
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(googleLoginSchema, request.body);
    sendAuthSuccess(request, response, await authService.loginWithGoogle(payload));
  } catch (error) {
    next(error);
  }
}

export async function googleRegister(request, response, next) {
  try {
    // Google registration still requires a GoldWallah role in the request body.
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
    // Backend validates Facebook app ownership and profile identity.
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(facebookLoginSchema, request.body);
    sendAuthSuccess(request, response, await authService.loginWithFacebook(payload));
  } catch (error) {
    next(error);
  }
}

export async function facebookRegister(request, response, next) {
  try {
    // Facebook registration mirrors Google registration with role validation.
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
