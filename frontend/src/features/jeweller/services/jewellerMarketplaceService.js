import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getMarketplaceListings(accessToken, filters = {}) {
  return apiRequest("listings/nearby", {
    headers: authHeaders(accessToken),
    query: {
      radiusKm: 50,
      ...filters,
    },
  });
}

export async function placePrivateBid(accessToken, payload) {
  return apiRequest(`listings/${payload.listingId}/bids`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      bidAmount: payload.bidAmount,
      message: payload.message,
    }),
  });
}

export async function getMyPrivateBids(accessToken) {
  return apiRequest("bids/my", {
    headers: authHeaders(accessToken),
  });
}
