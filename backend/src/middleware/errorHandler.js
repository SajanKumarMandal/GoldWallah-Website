import { env } from "../config/env.js";

export function errorHandler(error, request, response, _next) {
  request.log.error({ error }, "Unhandled request error");

  const statusCode = Number.isInteger(error.statusCode)
    ? error.statusCode
    : 500;

  response.status(statusCode).json({
    error: {
      message: statusCode === 500 ? "Internal server error" : error.message,
      code: error.code || "INTERNAL_ERROR",
      requestId: request.id,
      ...(env.isProduction ? {} : { stack: error.stack }),
    },
  });
}
