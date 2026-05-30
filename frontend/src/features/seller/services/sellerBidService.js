import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getListingBids(accessToken, listingId) {
  return apiRequest(`bids/listings/${listingId}`, {
    headers: authHeaders(accessToken),
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
