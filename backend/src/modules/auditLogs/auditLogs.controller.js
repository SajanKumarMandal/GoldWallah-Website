import { getAdminAuditLogs } from "./auditLogs.service.js";
import {
  auditLogQuerySchema,
  validateQuery,
} from "./auditLogs.validation.js";

export async function list(request, response, next) {
  try {
    const filters = validateQuery(auditLogQuerySchema, request.query);
    response.status(200).json(await getAdminAuditLogs(filters));
  } catch (error) {
    next(error);
  }
}
