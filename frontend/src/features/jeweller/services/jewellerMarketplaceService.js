import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getMarketplaceListings(accessToken, filters = {}) {
  return apiRequest("listings/marketplace", {
    headers: authHeaders(accessToken),
    query: filters,
  });
}

export async function placePrivateBid(accessToken, payload) {
  return apiRequest("bids", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function getMyPrivateBids(accessToken) {
  return apiRequest("bids/my", {
    headers: authHeaders(accessToken),
  });
}
