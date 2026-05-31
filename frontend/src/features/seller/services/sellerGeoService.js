import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getNearbyJewellers(accessToken, query = {}) {
  return apiRequest("geo-matching/jewellers", {
    headers: authHeaders(accessToken),
    query: {
      radiusKm: 50,
      limit: 6,
      ...query,
    },
  });
}
