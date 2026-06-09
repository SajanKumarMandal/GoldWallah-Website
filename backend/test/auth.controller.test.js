import { describe, expect, it } from "vitest";

process.env.NODE_ENV = "test";
process.env.REDIS_URL = "redis://127.0.0.1:6379/0";
process.env.FRONTEND_ORIGIN = "http://localhost:5173";
process.env.CSRF_SECRET = "csrf-secret-32-characters-long-value";

const { csrf, login, refresh } = await import("../src/modules/auth/auth.controller.js");

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
    clearedCookies: [],
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
    clearCookie(name, options) {
      this.clearedCookies.push({ name, options });
      return this;
    },
  };
}

describe("auth controller", () => {
  it("treats a malformed refresh cookie as an invalid token", async () => {
    const request = createMockRequest({
      cookie: "goldwallah_refresh_token=%; other_cookie=value",
    });
    const response = createMockResponse();
    let nextError;

    await refresh(request, response, (error) => {
      nextError = error;
    });

    expect(nextError?.statusCode).toBe(401);
    expect(nextError?.code).toBe("INVALID_REFRESH_TOKEN");
    expect(response.clearedCookies).toHaveLength(1);
    expect(response.clearedCookies[0].name).toBe("goldwallah_refresh_token");
    expect(response.clearedCookies[0].options.path).toBe("/api/v1/auth");
    expect(response.clearedCookies[0].options.httpOnly).toBe(true);
  });

  it("blocks unsafe browser auth requests without valid CSRF", async () => {
    const request = createMockRequest({
      origin: "http://localhost:5173",
      host: "localhost:5000",
      body: { email: "sajan@example.com", password: "Password123" },
    });
    const response = createMockResponse();
    let nextError;

    await login(request, response, (error) => {
      nextError = error;
    });

    expect(nextError?.statusCode).toBe(403);
    expect(nextError?.code).toBe("INVALID_CSRF_TOKEN");
  });

  it("allows unsafe browser auth requests with issued CSRF token", async () => {
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

    expect(nextError?.statusCode).toBe(400);
    expect(nextError?.code).toBe("VALIDATION_ERROR");
  });
});
