import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function loginAdmin({ email, password }) {
  return apiRequest("admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getAdminMe(accessToken) {
  return apiRequest("admin/auth/me", {
    headers: authHeaders(accessToken),
  });
}

export async function logoutAdmin(accessToken, refreshToken) {
  return apiRequest("admin/auth/logout", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ refreshToken }),
  });
}

export async function changeAdminPassword(accessToken, payload) {
  return apiRequest("admin/auth/change-password", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}
