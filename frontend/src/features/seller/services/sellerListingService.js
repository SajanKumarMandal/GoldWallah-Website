import { env } from "@/config/env";
import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export function resolveAssetUrl(path) {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const apiBaseUrl = env.apiBaseUrl.startsWith("http")
    ? env.apiBaseUrl
    : `${window.location.origin}${env.apiBaseUrl}`;
  const apiOrigin = new URL(apiBaseUrl).origin;

  return new URL(path, apiOrigin).toString();
}

export async function getMyListings(accessToken, filters = {}) {
  return apiRequest("listings/my", {
    headers: authHeaders(accessToken),
    query: { limit: 100, ...filters },
  });
}

export async function getListingById(listingId, accessToken) {
  return apiRequest(`listings/${listingId}`, {
    headers: authHeaders(accessToken),
  });
}

export async function createListing(formData, accessToken) {
  return apiRequest("listings", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: formData,
  });
}

export async function updateListing(listingId, formDataOrJson, accessToken) {
  const isFormData = formDataOrJson instanceof FormData;

  return apiRequest(`listings/${listingId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: isFormData ? formDataOrJson : JSON.stringify(formDataOrJson),
  });
}

export async function cancelListing(listingId, accessToken) {
  return apiRequest(`listings/${listingId}/cancel`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
  });
}
