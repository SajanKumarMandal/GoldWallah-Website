import {
  getDashboardSummary,
  getPendingVerifications,
  getRecentAuditLogs,
  getSecurityAlerts,
} from "./adminDashboard.repository.js";

export async function dashboardSummary() {
  return {
    success: true,
    data: await getDashboardSummary(),
  };
}

export async function pendingVerifications(filters) {
  return {
    success: true,
    data: await getPendingVerifications(filters),
  };
}

export async function recentAuditLogs(filters) {
  return {
    success: true,
    data: await getRecentAuditLogs(filters),
  };
}

export async function securityAlerts() {
  return {
    success: true,
    data: await getSecurityAlerts(),
  };
}
