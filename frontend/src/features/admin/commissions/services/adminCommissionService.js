import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function listAdminCommissions(accessToken, query = {}) {
  return apiRequest("admin/commissions", {
    headers: authHeaders(accessToken),
    query,
  });
}

export async function markAdminCommissionPaid(
  accessToken,
  commissionId,
  payload = {},
) {
  return apiRequest(`admin/commissions/${commissionId}/mark-paid`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function waiveAdminCommission(accessToken, commissionId, payload) {
  return apiRequest(`admin/commissions/${commissionId}/waive`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}
