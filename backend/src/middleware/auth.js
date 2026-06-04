import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { findUserById } from "../modules/users/users.repository.js";

// User API authentication: validates a short-lived JWT access token and attaches
// the latest user record so KYC, business, and commission gates are current.
function createAuthError() {
  // Use one generic unauthorized response for missing, malformed, and invalid JWTs.
  const error = new Error("Unauthorized");
  error.statusCode = 401;
  error.code = "UNAUTHORIZED";
  return error;
}

export async function authenticate(request, _response, next) {
  try {
    // Protected user APIs require a Bearer access token; refresh cookies are only
    // accepted by /auth/refresh.
    const authHeader = request.get("authorization") || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token || !env.jwtAccessSecret) {
      throw createAuthError();
    }

    let payload;

    try {
      // Verify signature and token audience/issuer before reading the subject.
      payload = jwt.verify(token, env.jwtAccessSecret, {
        issuer: "goldwallah-api",
        audience: "goldwallah-web",
        algorithms: ["HS256"],
      });
    } catch {
      throw createAuthError();
    }

    // Fetch latest user state on every request so account status and verification
    // gates cannot be bypassed with stale JWT claims.
    const user = await findUserById(payload.sub);

    if (!user) {
      throw createAuthError();
    }

    if (user.accountStatus !== "ACTIVE") {
      const error = new Error("Account is not active");
      error.statusCode = 403;
      error.code = "ACCOUNT_INACTIVE";
      throw error;
    }

    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...allowedRoles) {
  // Route-level RBAC guard. authenticate must run first so request.user exists.
  return (request, _response, next) => {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      error.code = "FORBIDDEN";
      next(error);
      return;
    }

    next();
  };
}
