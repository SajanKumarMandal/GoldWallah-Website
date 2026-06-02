import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function listBusinessVerifications({
  accessToken,
  status,
  limit = 100,
}) {
  return apiRequest("admin/jeweller-verifications", {
    headers: authHeaders(accessToken),
    query: { status, limit },
  });
}

export async function getBusinessVerification({ accessToken, verificationId }) {
  return apiRequest(`admin/jeweller-verifications/${verificationId}`, {
    headers: authHeaders(accessToken),
  });
}

export async function approveBusinessVerification({
  accessToken,
  verificationId,
  reviewNotes,
}) {
  return apiRequest(`admin/jeweller-verifications/${verificationId}/approve`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ reviewNotes }),
  });
}

export async function rejectBusinessVerification({
  accessToken,
  verificationId,
  rejectionReason,
  reviewNotes,
}) {
  return apiRequest(`admin/jeweller-verifications/${verificationId}/reject`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ rejectionReason, reviewNotes }),
  });
}
