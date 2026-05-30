import { withTransaction } from "../../config/db.js";
import {
  ADMIN_AUDIT_ACTIONS,
  writeAdminAuditLog,
} from "../admin/admin.audit.js";
import {
  clearJewellerCommissionLock,
  countOutstandingCommissions,
  findCommissionById,
  listPlatformCommissions,
  markCommissionPaid,
  markDealReadyToSettle,
  waiveCommission,
} from "./adminCommissions.repository.js";

// Admin finance service. Paid/waived commission changes are audited, and the
// jeweller lock clears only after every outstanding commission is resolved.
function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function unlockJewellerIfClear(jewellerId, client) {
  // Keep the lock if even one unpaid commission remains for this jeweller.
  const outstandingCount = await countOutstandingCommissions(jewellerId, client);

  if (outstandingCount === 0) {
    await clearJewellerCommissionLock(jewellerId, client);
  }
}

export async function getAdminCommissions(filters) {
  return {
    success: true,
    data: await listPlatformCommissions(filters),
  };
}

export async function markAdminCommissionPaid({
  admin,
  commissionId,
  payload,
  requestMeta,
}) {
  return withTransaction(async (client) => {
    const existing = await findCommissionById(commissionId, client);

    if (!existing) {
      throw createError("Commission not found", 404, "COMMISSION_NOT_FOUND");
    }

    const commission = await markCommissionPaid(
      {
        id: commissionId,
        razorpayPaymentId: payload.razorpayPaymentId,
      },
      client,
    );

    if (!commission) {
      throw createError(
        "Only unpaid commissions can be marked paid",
        409,
        "COMMISSION_NOT_PAYABLE",
      );
    }

    await markDealReadyToSettle(commission.dealId, client);
    await unlockJewellerIfClear(commission.jewellerId, client);
    await writeAdminAuditLog(
      {
        actorAdminId: admin.id,
        action: ADMIN_AUDIT_ACTIONS.commissionMarkedPaid,
        resourceType: "PLATFORM_COMMISSION",
        resourceId: commission.id,
        oldValue: { status: existing.status },
        newValue: {
          status: commission.status,
          paidAt: commission.paidAt,
          razorpayPaymentId: payload.razorpayPaymentId || null,
        },
        severity: "INFO",
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: "Commission marked paid",
      data: commission,
    };
  });
}

export async function waiveAdminCommission({
  admin,
  commissionId,
  payload,
  requestMeta,
}) {
  return withTransaction(async (client) => {
    const existing = await findCommissionById(commissionId, client);

    if (!existing) {
      throw createError("Commission not found", 404, "COMMISSION_NOT_FOUND");
    }

    const commission = await waiveCommission(
      {
        id: commissionId,
        adminId: admin.id,
        reason: payload.reason,
      },
      client,
    );

    if (!commission) {
      throw createError(
        "Only unpaid commissions can be waived",
        409,
        "COMMISSION_NOT_WAIVABLE",
      );
    }

    await markDealReadyToSettle(commission.dealId, client);
    await unlockJewellerIfClear(commission.jewellerId, client);
    await writeAdminAuditLog(
      {
        actorAdminId: admin.id,
        action: ADMIN_AUDIT_ACTIONS.commissionWaived,
        resourceType: "PLATFORM_COMMISSION",
        resourceId: commission.id,
        oldValue: { status: existing.status },
        newValue: {
          status: commission.status,
          waivedAt: commission.waivedAt,
          reason: payload.reason,
        },
        severity: "WARNING",
        requestMeta,
      },
      client,
    );

    return {
      success: true,
      message: "Commission waived",
      data: commission,
    };
  });
}
