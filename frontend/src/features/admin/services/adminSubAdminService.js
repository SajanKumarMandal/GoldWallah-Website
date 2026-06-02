import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function listSubAdmins(accessToken) {
  return apiRequest("admin/sub-admins", {
    headers: authHeaders(accessToken),
  });
}

export async function listAdminRoles(accessToken) {
  return apiRequest("admin/roles", {
    headers: authHeaders(accessToken),
  });
}

export async function createSubAdmin(accessToken, payload) {
  return apiRequest("admin/sub-admins", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function updateSubAdminStatus(accessToken, adminId, payload) {
  return apiRequest(`admin/sub-admins/${adminId}/status`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}
