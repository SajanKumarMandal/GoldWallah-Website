import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getCurrentUser(accessToken) {
  return apiRequest("users/me", {
    headers: authHeaders(accessToken),
  });
}

export async function getSellerDashboard(accessToken) {
  return apiRequest("seller/dashboard", {
    headers: authHeaders(accessToken),
  });
}

export async function getJewellerDashboard(accessToken) {
  return apiRequest("jeweller/dashboard", {
    headers: authHeaders(accessToken),
  });
}
