import { requestAuditMeta } from "../admin/admin.audit.js";
import {
  getAdminCommissions,
  markAdminCommissionPaid,
  waiveAdminCommission,
} from "./adminCommissions.service.js";
import {
  commissionIdParamSchema,
  commissionQuerySchema,
  markPaidSchema,
  validateBody,
  validateParams,
  validateQuery,
  waiveCommissionSchema,
} from "./adminCommissions.validation.js";

export async function list(request, response, next) {
  try {
    const filters = validateQuery(commissionQuerySchema, request.query);
    response.status(200).json(await getAdminCommissions(filters));
  } catch (error) {
    next(error);
  }
}

export async function markPaid(request, response, next) {
  try {
    const { commissionId } = validateParams(
      commissionIdParamSchema,
      request.params,
    );
    const payload = validateBody(markPaidSchema, request.body);

    response.status(200).json(
      await markAdminCommissionPaid({
        admin: request.admin,
        commissionId,
        payload,
        requestMeta: requestAuditMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function waive(request, response, next) {
  try {
    const { commissionId } = validateParams(
      commissionIdParamSchema,
      request.params,
    );
    const payload = validateBody(waiveCommissionSchema, request.body);

    response.status(200).json(
      await waiveAdminCommission({
        admin: request.admin,
        commissionId,
        payload,
        requestMeta: requestAuditMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}
