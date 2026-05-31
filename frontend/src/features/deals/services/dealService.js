import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getMyDeals(accessToken, query = {}) {
  return apiRequest("deals", {
    headers: authHeaders(accessToken),
    query,
  });
}

export async function completeDeal(accessToken, dealId) {
  return apiRequest(`deals/${dealId}/complete`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
  });
}
