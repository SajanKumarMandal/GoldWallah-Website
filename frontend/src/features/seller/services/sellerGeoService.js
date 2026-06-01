import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getNearbyJewellers(accessToken, query = {}) {
  return apiRequest("geo/nearby-jewellers", {
    headers: authHeaders(accessToken),
    query: {
      radiusKm: 30,
      limit: 9,
      ...query,
    },
  });
}
