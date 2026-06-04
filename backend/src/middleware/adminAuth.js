import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { findAdminById } from "../modules/admin/admin.repository.js";

// Admin authentication is separate from user auth. Admins use their own JWT
// secret, account status checks, RBAC permissions, and refresh-token rotation.
function createAuthError(message = "Unauthorized", code = "ADMIN_UNAUTHORIZED") {
  // Generic admin auth failure for missing, malformed, or invalid admin tokens.
  const error = new Error(message);
  error.statusCode = 401;
  error.code = code;
  return error;
}

function createForbiddenError(message = "Forbidden", code = "ADMIN_FORBIDDEN") {
  // Authenticated admins can still be forbidden when status/RBAC checks fail.
  const error = new Error(message);
  error.statusCode = 403;
  error.code = code;
  return error;
}

export async function requireAdminAuth(request, _response, next) {
  try {
    // Admin protected routes accept only Bearer admin access tokens; refresh
    // cookies are used solely by the admin refresh endpoint.
    const authHeader = request.get("authorization") || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw createAuthError();
    }

    let payload;

    try {
      // Verify against the admin JWT secret and admin-only audience.
      payload = jwt.verify(
        token,
        env.adminJwtAccessSecret || "test-admin-secret",
        {
          issuer: "goldwallah-api",
          audience: "goldwallah-admin",
          algorithms: ["HS256"],
        },
      );
    } catch {
      throw createAuthError();
    }

    if (payload.type !== "admin") {
      // User access tokens cannot be reused against admin endpoints.
      throw createAuthError();
    }

    // Fetch the latest admin row so account status and permissions are current.
    const admin = await findAdminById(payload.sub);

    if (!admin) {
      throw createAuthError();
    }

    if (admin.status !== "ACTIVE") {
      throw createForbiddenError("Admin account is not active", "ADMIN_NOT_ACTIVE");
    }

    request.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
}
