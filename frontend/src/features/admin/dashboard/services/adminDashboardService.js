import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getAdminDashboardSummary(accessToken) {
  return apiRequest("admin/dashboard/summary", {
    headers: authHeaders(accessToken),
  });
}

export async function getAdminPendingVerifications(accessToken, limit = 10) {
  return apiRequest("admin/dashboard/pending-verifications", {
    headers: authHeaders(accessToken),
    query: { limit },
  });
}

export async function getAdminRecentAuditLogs(accessToken, limit = 10) {
  return apiRequest("admin/dashboard/recent-audit-logs", {
    headers: authHeaders(accessToken),
    query: { limit },
  });
}

export async function getAdminSecurityAlerts(accessToken) {
  return apiRequest("admin/dashboard/security-alerts", {
    headers: authHeaders(accessToken),
  });
}
