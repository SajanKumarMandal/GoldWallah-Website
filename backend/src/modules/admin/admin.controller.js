import { env } from "../../config/env.js";
import { requestAuditMeta } from "./admin.audit.js";
import {
  createSubAdmin,
  changeAdminPassword,
  getCurrentAdmin,
  getSubAdmins,
  loginAdmin,
  logoutAdmin,
  refreshAdminSession,
  updateSubAdminStatus,
} from "./admin.service.js";
import {
  adminIdParamSchema,
  adminLoginSchema,
  adminLogoutSchema,
  adminRefreshSchema,
  changePasswordSchema,
  createSubAdminSchema,
  updateAdminStatusSchema,
  validateBody,
  validateParams,
} from "./admin.validation.js";

function sendSuccess(response, result, statusCode = 200) {
  response.status(statusCode).json(result);
}

const adminRefreshCookieName = "goldwallah_admin_refresh_token";

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

function adminRefreshCookieOptions(request) {
  const useCrossSiteCookie = env.isProduction && isCrossSiteFrontend(request);
  const options = {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: useCrossSiteCookie ? "none" : "lax",
    path: `/api/${request.app.locals.apiVersion || "v1"}/admin/auth`,
    maxAge: env.adminRefreshTokenTtlDays * 24 * 60 * 60 * 1000,
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

function clearAdminRefreshCookie(request, response) {
  const clearOptions = { ...adminRefreshCookieOptions(request) };
  delete clearOptions.maxAge;

  response.clearCookie(
    adminRefreshCookieName,
    clearOptions,
  );
}

function sendAdminAuthSuccess(request, response, result, statusCode = 200) {
  const refreshToken = result?.data?.refreshToken;

  if (refreshToken) {
    response.cookie(
      adminRefreshCookieName,
      refreshToken,
      adminRefreshCookieOptions(request),
    );
  }

  const safeData = { ...(result?.data || {}) };
  delete safeData.refreshToken;

  sendSuccess(
    response,
    {
      ...result,
      data: safeData,
    },
    statusCode,
  );
}

export async function login(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(adminLoginSchema, request.body);
    sendAdminAuthSuccess(
      request,
      response,
      await loginAdmin({ payload, requestMeta: requestAuditMeta(request) }),
    );
  } catch (error) {
    next(error);
  }
}

export async function refresh(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const refreshToken = readCookie(request, adminRefreshCookieName);

    if (!refreshToken) {
      throw createInvalidRefreshTokenError();
    }

    const payload = validateBody(adminRefreshSchema, {
      refreshToken,
    });
    sendAdminAuthSuccess(
      request,
      response,
      await refreshAdminSession({
        refreshToken: payload.refreshToken,
        requestMeta: requestAuditMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function logout(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const refreshToken = readCookie(request, adminRefreshCookieName);
    clearAdminRefreshCookie(request, response);

    if (!refreshToken) {
      sendSuccess(response, {
        success: true,
        message: "Logged out successfully",
      });
      return;
    }

    const payload = validateBody(adminLogoutSchema, { refreshToken });
    sendSuccess(
      response,
      await logoutAdmin({
        admin: request.admin || null,
        refreshToken: payload.refreshToken,
        requestMeta: requestAuditMeta(request),
      }),
    );
  } catch (error) {
    clearAdminRefreshCookie(request, response);
    next(error);
  }
}

export async function me(request, response, next) {
  try {
    sendSuccess(response, await getCurrentAdmin(request.admin));
  } catch (error) {
    next(error);
  }
}

export async function changePassword(request, response, next) {
  try {
    assertTrustedBrowserOrigin(request);
    const payload = validateBody(changePasswordSchema, request.body);
    const result = await changeAdminPassword({
      admin: request.admin,
      payload,
      requestMeta: requestAuditMeta(request),
    });

    clearAdminRefreshCookie(request, response);
    sendSuccess(response, result);
  } catch (error) {
    next(error);
  }
}

export async function listSubAdmins(_request, response, next) {
  try {
    sendSuccess(response, await getSubAdmins());
  } catch (error) {
    next(error);
  }
}

export async function createSubAdminHandler(request, response, next) {
  try {
    const payload = validateBody(createSubAdminSchema, request.body);
    sendSuccess(
      response,
      await createSubAdmin({
        actorAdmin: request.admin,
        payload,
        requestMeta: requestAuditMeta(request),
      }),
      201,
    );
  } catch (error) {
    next(error);
  }
}

export async function updateSubAdminStatusHandler(request, response, next) {
  try {
    const { id } = validateParams(adminIdParamSchema, request.params);
    const payload = validateBody(updateAdminStatusSchema, request.body);
    sendSuccess(
      response,
      await updateSubAdminStatus({
        actorAdmin: request.admin,
        adminId: id,
        payload,
        requestMeta: requestAuditMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}
