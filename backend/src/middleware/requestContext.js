import { randomUUID } from "node:crypto";

export function requestContext(request, response, next) {
  const requestId = request.get("x-request-id") || randomUUID();

  request.id = requestId;
  request.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  next();
}
