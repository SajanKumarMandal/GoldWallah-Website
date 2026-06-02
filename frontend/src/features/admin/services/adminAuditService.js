import { apiRequest } from "@/services/httpClient";

function authHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function listAuditLogs(accessToken, query = {}) {
  return apiRequest("audit-logs", {
    headers: authHeaders(accessToken),
    query,
  });
}

export async function listSecurityAlerts(accessToken, query = {}) {
  return apiRequest("security-fraud/alerts", {
    headers: authHeaders(accessToken),
    query,
  });
}
