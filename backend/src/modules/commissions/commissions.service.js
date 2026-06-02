import { withTransaction } from "../../config/db.js";
import {
  createCommissionAuditLog,
  findJewellerCommissionById,
  listJewellerCommissions,
  submitCommissionPayment,
} from "./commissions.repository.js";

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function assertJeweller(user) {
  if (user.role !== "JEWELLER") {
    throw createError("Jeweller role is required", 403, "JEWELLER_REQUIRED");
  }
}

export async function getMyCommissions({ user, query }) {
  assertJeweller(user);

  return {
    success: true,
    data: await listJewellerCommissions({
      jewellerId: user.id,
      status: query.status,
      limit: query.limit,
    }),
  };
}

export async function submitMyCommissionPayment({
  user,
  commissionId,
  payload,
  requestMeta,
}) {
  assertJeweller(user);

  return withTransaction(async (client) => {
    const existing = await findJewellerCommissionById(
      { commissionId, jewellerId: user.id },
      client,
    );

    if (!existing) {
      throw createError("Commission not found", 404, "COMMISSION_NOT_FOUND");
    }

    const commission = await submitCommissionPayment(
      {
        commissionId,
        jewellerId: user.id,
        paymentReference: payload.paymentReference,
        paymentNote: payload.paymentNote,
      },
      client,
    );

    if (!commission) {
      throw createError(
        "This commission cannot accept a payment reference",
        409,
        "COMMISSION_PAYMENT_NOT_ALLOWED",
      );
    }

    await createCommissionAuditLog(
      {
        actorUserId: user.id,
        action: "COMMISSION_PAYMENT_REFERENCE_SUBMITTED",
        commissionId: commission.id,
        metadata: {
          previousStatus: existing.status,
          nextStatus: commission.status,
          dealId: commission.dealId,
          paymentReference: commission.paymentReference,
        },
        ipAddress: requestMeta?.ipAddress,
        userAgent: requestMeta?.userAgent,
      },
      client,
    );

    return {
      success: true,
      message: "Commission payment submitted for admin review",
      data: commission,
    };
  });
}
