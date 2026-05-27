import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { findUserById } from "../modules/users/users.repository.js";

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
      payload = jwt.verify(token, env.jwtAccessSecret);
    } catch {
      throw createAuthError();
    }

    const user = await findUserById(payload.sub);

    if (!user) {
      throw createAuthError();
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
