import { listAdminAuditLogs } from "../auditLogs/auditLogs.repository.js";

export async function getSecurityFraudAlerts(filters = {}) {
  const periodHours = Math.min(Math.max(Number(filters.periodHours) || 24, 1), 168);
  const from = new Date(Date.now() - periodHours * 60 * 60 * 1000).toISOString();
  const severities = filters.severity
    ? [filters.severity]
    : ["WARNING", "CRITICAL"];
  const result = await listAdminAuditLogs({
    severities,
    from,
    limit: filters.limit,
  });

  return {
    success: true,
    data: {
      alerts: result.logs,
      hasMore: result.hasMore,
      periodHours,
    },
  };
}
