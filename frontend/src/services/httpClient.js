import { env } from "@/config/env";

// Shared fetch wrapper. It always sends credentials so the backend HttpOnly
// refresh cookie can rotate sessions without exposing that token to JavaScript.
function buildUrl(path, query) {
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

export async function apiRequest(path, options = {}) {
  const { query, headers, ...fetchOptions } = options;
  const isFormData = fetchOptions.body instanceof FormData;
  const response = await fetch(buildUrl(path, query), {
    credentials: "include",
    ...fetchOptions,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
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
