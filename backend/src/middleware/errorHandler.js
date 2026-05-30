export function errorHandler(error, request, response, _next) {
  request.log.error({ error }, "Unhandled request error");

  const statusCode = Number.isInteger(error.statusCode)
    ? error.statusCode
    : 500;

  const message = statusCode === 500 ? "Internal server error" : error.message;

  response.status(statusCode).json({
    message,
    error: {
      message,
      code: error.code || "INTERNAL_ERROR",
      requestId: request.id,
      ...(error.details ? { details: error.details } : {}),
    },
  });
}
