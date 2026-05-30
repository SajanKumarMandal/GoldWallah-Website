import * as authService from "./auth.service.js";
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

function sendSuccess(response, result, statusCode = 200) {
  response.status(statusCode).json(result);
}

function refreshCookieOptions(request) {
  return {
    httpOnly: true,
    secure: request.app.get("env") === "production",
    sameSite: "lax",
    path: `/api/${request.app.locals.apiVersion || "v1"}/auth`,
  };
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
    const payload = validateBody(loginSchema, request.body);
    sendAuthSuccess(request, response, await authService.loginWithEmail(payload));
  } catch (error) {
    next(error);
  }
}

export async function refresh(request, response, next) {
  try {
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
    const payload = validateBody(sendOtpSchema, request.body);
    sendSuccess(response, await authService.sendLoginOtp(payload));
  } catch (error) {
    next(error);
  }
}

export async function verifyLoginOtp(request, response, next) {
  try {
    const payload = validateBody(verifyLoginOtpSchema, request.body);
    sendAuthSuccess(request, response, await authService.verifyLoginOtp(payload));
  } catch (error) {
    next(error);
  }
}

export async function sendRegisterOtp(request, response, next) {
  try {
    const payload = validateBody(sendOtpSchema, request.body);
    sendSuccess(response, await authService.sendRegisterOtp(payload));
  } catch (error) {
    next(error);
  }
}

export async function verifyRegisterOtp(request, response, next) {
  try {
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
    const payload = validateBody(googleLoginSchema, request.body);
    sendSuccess(response, await authService.loginWithGoogle(payload));
  } catch (error) {
    next(error);
  }
}

export async function googleRegister(request, response, next) {
  try {
    const payload = validateBody(googleRegisterSchema, request.body);
    sendSuccess(response, await authService.registerWithGoogle(payload), 201);
  } catch (error) {
    next(error);
  }
}

export async function facebookLogin(request, response, next) {
  try {
    const payload = validateBody(facebookLoginSchema, request.body);
    sendSuccess(response, await authService.loginWithFacebook(payload));
  } catch (error) {
    next(error);
  }
}

export async function facebookRegister(request, response, next) {
  try {
    const payload = validateBody(facebookRegisterSchema, request.body);
    sendSuccess(response, await authService.registerWithFacebook(payload), 201);
  } catch (error) {
    next(error);
  }
}
