import { env } from "@/config/env";

function buildUrl(path, query) {
  const baseUrl = env.apiBaseUrl.startsWith("http")
    ? env.apiBaseUrl
    : `${window.location.origin}${env.apiBaseUrl}`;
  const url = new URL(path, baseUrl);

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
  const response = await fetch(buildUrl(path, query), {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = isJson && body?.message ? body.message : "Request failed";
    throw new Error(message);
  }

  return body;
}
