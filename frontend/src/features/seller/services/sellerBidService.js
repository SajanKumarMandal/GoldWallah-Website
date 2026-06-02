import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getListingBids(accessToken, listingId) {
  return apiRequest(`seller/listings/${listingId}/bids`, {
    headers: authHeaders(accessToken),
    query: { limit: 100 },
  });
}

export async function acceptBid(accessToken, bidId) {
  return apiRequest(`bids/${bidId}/accept`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
  });
}

export async function rejectBid(accessToken, bidId) {
  return apiRequest(`bids/${bidId}/reject`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
  });
}
