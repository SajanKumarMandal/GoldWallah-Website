import { env } from "@/config/env";

// Shared fetch wrapper. It always sends credentials so the backend HttpOnly
// refresh cookie can rotate sessions without exposing that token to JavaScript.
let csrfToken = "";
let csrfTokenPromise = null;

export function buildApiUrl(path, query) {
  const baseUrl = env.apiBaseUrl.startsWith("http")
    ? env.apiBaseUrl
    : `${window.location.origin}${env.apiBaseUrl}`;
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizedBaseUrl);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  return url;
}

function isUnsafeHttpMethod(method) {
  return !["GET", "HEAD", "OPTIONS"].includes(method);
}

async function fetchCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch(buildApiUrl("auth/csrf"), {
      credentials: "include",
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);

        if (!response.ok || !body?.data?.csrfToken) {
          throw new Error("Unable to initialize request protection.");
        }

        csrfToken = body.data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfTokenPromise = null;
      });
  }

  return csrfTokenPromise;
}

async function csrfHeaderFor(method) {
  if (!isUnsafeHttpMethod(method)) {
    return {};
  }

  return {
    "X-CSRF-Token": csrfToken || (await fetchCsrfToken()),
  };
}

async function executeApiRequest(path, options, allowCsrfRetry) {
  const { query, headers, ...fetchOptions } = options;
  const isFormData = fetchOptions.body instanceof FormData;
  const method = (fetchOptions.method || "GET").toUpperCase();
  const csrfHeaders = await csrfHeaderFor(method);
  const response = await fetch(buildApiUrl(path, query), {
    credentials: "include",
    ...fetchOptions,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...csrfHeaders,
      ...headers,
    },
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorCode = isJson ? body?.error?.code : "";

    if (
      allowCsrfRetry &&
      response.status === 403 &&
      ["INVALID_CSRF_TOKEN", "CSRF_HEADER_REQUIRED"].includes(errorCode)
    ) {
      csrfToken = "";
      await fetchCsrfToken();
      return executeApiRequest(path, options, false);
    }

    const message =
      isJson && (body?.message || body?.error?.message)
        ? body.message || body.error.message
        : "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.details = isJson ? body?.error?.details : undefined;
    throw error;
  }

  return body;
}

export async function apiRequest(path, options = {}) {
  return executeApiRequest(path, options, true);
}
