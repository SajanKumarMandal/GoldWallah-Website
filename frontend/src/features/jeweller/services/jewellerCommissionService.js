import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getMyCommissions(accessToken, query = {}) {
  return apiRequest("commissions/my", {
    headers: authHeaders(accessToken),
    query,
  });
}

export async function submitCommissionPayment(accessToken, commissionId, payload) {
  return apiRequest(`commissions/${commissionId}/payment`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}
