import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { findUserById } from "../modules/users/users.repository.js";

// User API authentication: validates a short-lived JWT access token and attaches
// the latest user record so KYC, business, and commission gates are current.
function createAuthError() {
  const error = new Error("Unauthorized");
  error.statusCode = 401;
  error.code = "UNAUTHORIZED";
  return error;
}

export async function authenticate(request, _response, next) {
  try {
    const authHeader = request.get("authorization") || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token || !env.jwtAccessSecret) {
      throw createAuthError();
    }

    let payload;

    try {
      payload = jwt.verify(token, env.jwtAccessSecret, {
        issuer: "goldwallah-api",
        audience: "goldwallah-web",
        algorithms: ["HS256"],
      });
    } catch {
      throw createAuthError();
    }

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
