import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { findAdminById } from "../modules/admin/admin.repository.js";

// Admin authentication is separate from user auth. Admins use their own JWT
// secret, account status checks, RBAC permissions, and refresh-token rotation.
function createAuthError(message = "Unauthorized", code = "ADMIN_UNAUTHORIZED") {
  const error = new Error(message);
  error.statusCode = 401;
  error.code = code;
  return error;
}

function createForbiddenError(message = "Forbidden", code = "ADMIN_FORBIDDEN") {
  const error = new Error(message);
  error.statusCode = 403;
  error.code = code;
  return error;
}

export async function requireAdminAuth(request, _response, next) {
  try {
    const authHeader = request.get("authorization") || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw createAuthError();
    }

    let payload;

    try {
      payload = jwt.verify(
        token,
        env.adminJwtAccessSecret || "test-admin-secret",
      );
    } catch {
      throw createAuthError();
    }

    if (payload.type !== "admin") {
      throw createAuthError();
    }

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
