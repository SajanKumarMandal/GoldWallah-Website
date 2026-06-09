import { describe, expect, it } from "vitest";

process.env.NODE_ENV = "test";
process.env.REDIS_URL = "redis://127.0.0.1:6379/0";
process.env.FRONTEND_ORIGIN = "http://localhost:5173";
process.env.CSRF_SECRET = "csrf-secret-32-characters-long-value";

const { csrf } = await import("../src/modules/auth/auth.controller.js");
const { login } = await import("../src/modules/admin/admin.controller.js");

function createMockRequest(headers = {}) {
  const normalizedHeaders = new Map(
    Object.entries(headers)
      .filter(([key]) => !["body", "method"].includes(key))
      .map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    method: headers.method || "POST",
    protocol: "http",
    app: {
      locals: {
        apiVersion: "v1",
      },
    },
    body: headers.body || {},
    get(name) {
      return normalizedHeaders.get(name.toLowerCase()) || "";
    },
  };
}

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    cookies: [],
    cookie(name, value, options) {
      this.cookies.push({ name, value, options });
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

describe("admin auth controller CSRF", () => {
  it("blocks unsafe admin auth requests without signed CSRF", async () => {
    const request = createMockRequest({
      origin: "http://localhost:5173",
      host: "localhost:5000",
      body: { email: "admin@example.com", password: "AdminPass123!" },
    });
    const response = createMockResponse();
    let nextError;

    await login(request, response, (error) => {
      nextError = error;
    });

    expect(nextError?.statusCode).toBe(403);
    expect(nextError?.code).toBe("INVALID_CSRF_TOKEN");
  });

  it("allows admin auth requests with the shared issued CSRF token", async () => {
    const csrfRequest = createMockRequest({
      method: "GET",
      origin: "http://localhost:5173",
      host: "localhost:5000",
    });
    const csrfResponse = createMockResponse();

    await csrf(csrfRequest, csrfResponse, (error) => {
      throw error;
    });

    const csrfToken = csrfResponse.body.data.csrfToken;
    const csrfCookie = csrfResponse.cookies[0];
    const request = createMockRequest({
      origin: "http://localhost:5173",
      host: "localhost:5000",
      "x-csrf-token": csrfToken,
      cookie: `${csrfCookie.name}=${encodeURIComponent(csrfCookie.value)}`,
      body: {},
    });
    const response = createMockResponse();
    let nextError;

    await login(request, response, (error) => {
      nextError = error;
    });

    expect(csrfCookie.options.path).toBe("/api/v1");
    expect(nextError?.statusCode).toBe(400);
    expect(nextError?.code).toBe("VALIDATION_ERROR");
  });
});
