import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function rolePath(role) {
  return role === "jeweller" ? "jeweller" : "seller";
}

export async function listKycSubmissions({ accessToken, status, role = "seller" }) {
  return apiRequest(`kyc/admin/${rolePath(role)}`, {
    headers: authHeaders(accessToken),
    query: { status, limit: 100 },
  });
}

export async function getKycSubmission({ accessToken, kycId, role = "seller" }) {
  return apiRequest(`kyc/admin/${rolePath(role)}/${kycId}`, {
    headers: authHeaders(accessToken),
  });
}

export async function approveKyc({ accessToken, kycId, role = "seller" }) {
  return apiRequest(`kyc/admin/${rolePath(role)}/${kycId}/approve`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
  });
}

export async function rejectKyc({
  accessToken,
  kycId,
  rejectionReason,
  role = "seller",
}) {
  return apiRequest(`kyc/admin/${rolePath(role)}/${kycId}/reject`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ rejectionReason }),
  });
}

export const listSellerKycSubmissions = (params) =>
  listKycSubmissions({ ...params, role: "seller" });
export const getSellerKycSubmission = (params) =>
  getKycSubmission({ ...params, role: "seller" });
export const approveSellerKyc = (params) =>
  approveKyc({ ...params, role: "seller" });
export const rejectSellerKyc = (params) =>
  rejectKyc({ ...params, role: "seller" });

export const listJewellerKycSubmissions = (params) =>
  listKycSubmissions({ ...params, role: "jeweller" });
export const getJewellerKycSubmission = (params) =>
  getKycSubmission({ ...params, role: "jeweller" });
export const approveJewellerKyc = (params) =>
  approveKyc({ ...params, role: "jeweller" });
export const rejectJewellerKyc = (params) =>
  rejectKyc({ ...params, role: "jeweller" });
