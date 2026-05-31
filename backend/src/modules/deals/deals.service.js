import { withTransaction } from "../../config/db.js";
import { notifyUser } from "../notifications/notifications.service.js";
import {
  completeSellerDeal,
  createDealAuditLog,
  findDealForUser,
  listDealsForUser,
} from "./deals.repository.js";

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function assertDealRole(user) {
  if (!["SELLER", "JEWELLER"].includes(user.role)) {
    throw createError("Forbidden", 403, "FORBIDDEN");
  }
}

async function auditDeal({ actorUserId, action, deal, requestMeta }, client) {
  await createDealAuditLog(
    {
      actorUserId,
      action,
      dealId: deal.id,
      metadata: {
        listingId: deal.listingId,
        sellerId: deal.sellerId,
        jewellerId: deal.jewellerId,
        status: deal.status,
      },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    },
    client,
  );
}

export async function getMyDeals({ user, query }) {
  assertDealRole(user);

  return {
    success: true,
    data: await listDealsForUser({
      userId: user.id,
      role: user.role,
      status: query.status,
      limit: query.limit,
    }),
  };
}

export async function getMyDealDetail({ user, dealId }) {
  assertDealRole(user);

  const deal = await findDealForUser({ dealId, userId: user.id });

  if (!deal) {
    throw createError("Deal not found", 404, "DEAL_NOT_FOUND");
  }

  return {
    success: true,
    data: deal,
  };
}

export async function completeDeal({ user, dealId, requestMeta }) {
  if (user.role !== "SELLER") {
    throw createError("Only the seller can complete a deal", 403, "SELLER_REQUIRED");
  }

  return withTransaction(async (client) => {
    const existingDeal = await findDealForUser(
      { dealId, userId: user.id },
      client,
    );

    if (!existingDeal) {
      throw createError("Deal not found", 404, "DEAL_NOT_FOUND");
    }

    if (existingDeal.status === "COMMISSION_PENDING") {
      throw createError(
        "Commission must be paid or waived before deal completion",
        409,
        "COMMISSION_PENDING",
      );
    }

    if (existingDeal.status !== "READY_TO_SETTLE") {
      throw createError(
        "Only ready-to-settle deals can be completed",
        409,
        "DEAL_NOT_READY",
      );
    }

    const deal = await completeSellerDeal({ dealId, sellerId: user.id }, client);

    if (!deal) {
      throw createError("Deal could not be completed", 409, "DEAL_COMPLETE_CONFLICT");
    }

    await auditDeal(
      {
        actorUserId: user.id,
        action: "DEAL_COMPLETED",
        deal,
        requestMeta,
      },
      client,
    );
    await notifyUser(
      {
        userId: deal.jewellerId,
        type: "DEAL_COMPLETED",
        title: "Deal completed",
        body: "The seller marked your accepted GoldWallah deal as completed.",
        entityType: "DEAL",
        entityId: deal.id,
      },
      client,
    );

    return {
      success: true,
      message: "Deal completed",
      data: deal,
    };
  });
}
