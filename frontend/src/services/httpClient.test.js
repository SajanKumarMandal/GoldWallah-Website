import { beforeEach, describe, expect, it, vi } from "vitest";

describe("httpClient CSRF handling", () => {
  beforeEach(() => {
    vi.resetModules();
    globalThis.fetch = vi.fn();
  });

  it("does not fetch CSRF for public login requests", async () => {
    const { apiRequest } = await import("./httpClient");
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ success: true }),
    });

    await apiRequest("auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "sajan@example.com", password: "Password123" }),
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch.mock.calls[0][1].headers["X-CSRF-Token"]).toBeUndefined();
  });

  it("fetches and attaches a CSRF token for cookie-backed auth requests", async () => {
    const { apiRequest } = await import("./httpClient");
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: { csrfToken: "csrf-token" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true }),
      });

    await apiRequest("auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch.mock.calls[1][1].headers["X-CSRF-Token"]).toBe("csrf-token");
  });

  it("fetches and attaches a CSRF token for unsafe admin auth requests", async () => {
    const { apiRequest } = await import("./httpClient");
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: { csrfToken: "admin-csrf-token" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true }),
      });

    await apiRequest("admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@example.com", password: "Password123" }),
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch.mock.calls[1][1].headers["X-CSRF-Token"]).toBe(
      "admin-csrf-token",
    );
  });

  it("refreshes CSRF token once after token rejection", async () => {
    const { apiRequest } = await import("./httpClient");
    globalThis.fetch
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: { csrfToken: "old-token" } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          error: { code: "INVALID_CSRF_TOKEN", message: "Invalid CSRF token" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ data: { csrfToken: "new-token" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true }),
      });

    await apiRequest("auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
    expect(globalThis.fetch.mock.calls[3][1].headers["X-CSRF-Token"]).toBe("new-token");
  });
});
