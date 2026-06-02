import { getSecurityFraudAlerts } from "./securityFraud.service.js";
import {
  securityAlertQuerySchema,
  validateQuery,
} from "./securityFraud.validation.js";

export async function alerts(request, response, next) {
  try {
    const filters = validateQuery(securityAlertQuerySchema, request.query);
    response.status(200).json(await getSecurityFraudAlerts(filters));
  } catch (error) {
    next(error);
  }
}
