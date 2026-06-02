import {
  getMyCommissions,
  submitMyCommissionPayment,
} from "./commissions.service.js";
import {
  commissionIdParamSchema,
  commissionQuerySchema,
  submitPaymentSchema,
  validateBody,
  validateParams,
  validateQuery,
} from "./commissions.validation.js";

function requestMeta(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.get("user-agent") || null,
  };
}

export async function myCommissions(request, response, next) {
  try {
    const query = validateQuery(commissionQuerySchema, request.query);
    response.status(200).json(
      await getMyCommissions({
        user: request.user,
        query,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function submitPayment(request, response, next) {
  try {
    const { commissionId } = validateParams(
      commissionIdParamSchema,
      request.params,
    );
    const payload = validateBody(submitPaymentSchema, request.body);
    response.status(200).json(
      await submitMyCommissionPayment({
        user: request.user,
        commissionId,
        payload,
        requestMeta: requestMeta(request),
      }),
    );
  } catch (error) {
    if (error.code === "23505") {
      error.statusCode = 409;
      error.code = "PAYMENT_REFERENCE_ALREADY_USED";
      error.message = "Payment reference is already used";
    }

    next(error);
  }
}
