import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function listSellerKycSubmissions({ accessToken, status }) {
  return apiRequest("kyc/admin/seller", {
    headers: authHeaders(accessToken),
    query: { status, limit: 100 },
  });
}

export async function getSellerKycSubmission({ accessToken, kycId }) {
  return apiRequest(`kyc/admin/seller/${kycId}`, {
    headers: authHeaders(accessToken),
  });
}

export async function approveSellerKyc({ accessToken, kycId }) {
  return apiRequest(`kyc/admin/seller/${kycId}/approve`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
  });
}

export async function rejectSellerKyc({ accessToken, kycId, rejectionReason }) {
  return apiRequest(`kyc/admin/seller/${kycId}/reject`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ rejectionReason }),
  });
}
