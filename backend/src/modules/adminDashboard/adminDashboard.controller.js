import {
  dashboardSummary,
  pendingVerifications,
  recentAuditLogs,
  securityAlerts,
} from "./adminDashboard.service.js";

function parseLimit(query) {
  return query.limit;
}

export async function summary(_request, response, next) {
  try {
    response.status(200).json(await dashboardSummary());
  } catch (error) {
    next(error);
  }
}

export async function pending(request, response, next) {
  try {
    response.status(200).json(
      await pendingVerifications({ limit: parseLimit(request.query) }),
    );
  } catch (error) {
    next(error);
  }
}

export async function audits(request, response, next) {
  try {
    response.status(200).json(
      await recentAuditLogs({ limit: parseLimit(request.query) }),
    );
  } catch (error) {
    next(error);
  }
}

export async function alerts(_request, response, next) {
  try {
    response.status(200).json(await securityAlerts());
  } catch (error) {
    next(error);
  }
}
