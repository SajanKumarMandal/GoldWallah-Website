import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function updateMyLocation(accessToken, location) {
  return apiRequest("users/me/location", {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      latitude: location.latitude,
      longitude: location.longitude,
    }),
  });
}

