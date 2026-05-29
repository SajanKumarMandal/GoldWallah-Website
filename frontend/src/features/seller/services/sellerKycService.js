import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getMySellerKyc(accessToken) {
  return apiRequest("kyc/seller/me", {
    headers: authHeaders(accessToken),
  });
}

export async function submitSellerKyc(formData, accessToken) {
  return apiRequest("kyc/seller", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: formData,
  });
}

export const getSellerKyc = getMySellerKyc;
