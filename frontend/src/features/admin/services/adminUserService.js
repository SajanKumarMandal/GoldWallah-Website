import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function listAdminUsers(accessToken, query = {}) {
  return apiRequest("admin/users", {
    headers: authHeaders(accessToken),
    query,
  });
}

export async function blockAdminUser(accessToken, userId, payload) {
  return apiRequest(`admin/users/${userId}/block`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function unblockAdminUser(accessToken, userId, payload) {
  return apiRequest(`admin/users/${userId}/unblock`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}
