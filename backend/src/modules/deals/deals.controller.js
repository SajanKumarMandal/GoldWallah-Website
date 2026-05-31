import {
  completeDeal,
  getMyDealDetail,
  getMyDeals,
} from "./deals.service.js";
import {
  dealParamSchema,
  dealQuerySchema,
  validateParams,
  validateQuery,
} from "./deals.validation.js";

function requestMeta(request) {
  return {
    ipAddress: request.ip,
    userAgent: request.get("user-agent") || null,
  };
}

export async function myDeals(request, response, next) {
  try {
    const query = validateQuery(dealQuerySchema, request.query);
    response.status(200).json(
      await getMyDeals({
        user: request.user,
        query,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function dealDetail(request, response, next) {
  try {
    const { dealId } = validateParams(dealParamSchema, request.params);
    response.status(200).json(
      await getMyDealDetail({
        user: request.user,
        dealId,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function complete(request, response, next) {
  try {
    const { dealId } = validateParams(dealParamSchema, request.params);
    response.status(200).json(
      await completeDeal({
        user: request.user,
        dealId,
        requestMeta: requestMeta(request),
      }),
    );
  } catch (error) {
    next(error);
  }
}
