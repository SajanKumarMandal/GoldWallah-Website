import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getNotifications(accessToken, query = {}) {
  return apiRequest("notifications", {
    headers: authHeaders(accessToken),
    query,
  });
}

export async function markAllNotificationsRead(accessToken) {
  return apiRequest("notifications/read-all", {
    method: "PATCH",
    headers: authHeaders(accessToken),
  });
}

export async function markNotificationRead(accessToken, notificationId) {
  return apiRequest(`notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
  });
}
