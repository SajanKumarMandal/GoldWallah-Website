export function notFoundHandler(request, response) {
  response.status(404).json({
    error: {
      message: "Route not found",
      code: "ROUTE_NOT_FOUND",
      requestId: request.id,
    },
  });
}
