import { withTransaction } from "../../config/db.js";
import { requireJewellerCanTransact } from "../jewellerVerification/jewellerTransactionGuard.js";
import { notifyUser } from "../notifications/notifications.service.js";
import {
  acceptBid,
  createBid,
  createBidAuditLog,
  findActiveListingForBid,
  findBidForSellerDecision,
  listBidsForJeweller,
  listBidsForSellerListing,
  rejectBid,
} from "./bids.repository.js";

// Private bidding service. Bid amounts are visible to the seller only, and
// accepting a bid creates the deal plus the platform commission lock.
function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function assertSeller(user) {
  if (user.role !== "SELLER") {
    throw createError("Seller role is required", 403, "SELLER_ROLE_REQUIRED");
  }
}

async function auditBid({ actorUserId, action, bid, requestMeta }, client) {
  await createBidAuditLog(
    {
      actorUserId,
      action,
      bidId: bid.id,
      metadata: {
        listingId: bid.listingId,
        jewellerId: bid.jewellerId,
        bidAmount: bid.bidAmount,
        status: bid.status,
      },
      ipAddress: requestMeta?.ipAddress,
      userAgent: requestMeta?.userAgent,
    },
    client,
  );
}

export async function placeBid({ user, payload, requestMeta }) {
  // A jeweller must have approved KYC, approved business verification, and no
  // unpaid commission lock before placing bids.
  requireJewellerCanTransact(user);

  return withTransaction(async (client) => {
    const listing = await findActiveListingForBid(payload.listingId, client);

    if (!listing) {
      throw createError("Listing not found", 404, "LISTING_NOT_FOUND");
    }

    if (listing.status !== "ACTIVE") {
      throw createError("Listing is not open for bids", 409, "LISTING_NOT_ACTIVE");
    }

    try {
      const bid = await createBid(
        {
          listingId: payload.listingId,
          jewellerId: user.id,
          bidAmount: payload.bidAmount,
          message: payload.message,
        },
        client,
      );

      await auditBid({
        actorUserId: user.id,
        action: "PRIVATE_BID_PLACED",
        bid,
        requestMeta,
      }, client);
      await notifyUser(
        {
          userId: listing.sellerId,
          type: "PRIVATE_BID_RECEIVED",
          title: "New private bid",
          body: "A verified jeweller placed a private bid on your listing.",
          entityType: "PRIVATE_BID",
          entityId: bid.id,
        },
        client,
      );

      return {
        success: true,
        message: "Bid placed privately",
        data: bid,
      };
    } catch (error) {
      if (error.code === "23505") {
        throw createError(
          "You already have a pending bid for this listing.",
          409,
          "PENDING_BID_EXISTS",
        );
      }

      throw error;
    }
  });
}

export async function getSellerListingBids({ user, listingId, query = {} }) {
  assertSeller(user);

  return {
    success: true,
    data: await listBidsForSellerListing({
      listingId,
      sellerId: user.id,
      limit: query.limit,
    }),
  };
}

export async function getMyJewellerBids(user, query = {}) {
  requireJewellerCanTransact(user);

  return {
    success: true,
    data: await listBidsForJeweller({
      jewellerId: user.id,
      limit: query.limit,
    }),
  };
}

export async function acceptSellerBid({ user, bidId, requestMeta }) {
  // Accepting one bid rejects the other pending bids for the listing and creates
  // the finance record that admins later settle or waive.
  assertSeller(user);

  return withTransaction(async (client) => {
    const existingBid = await findBidForSellerDecision(
      { bidId, sellerId: user.id },
      client,
    );

    if (!existingBid) {
      throw createError("Bid not found", 404, "BID_NOT_FOUND");
    }

    if (existingBid.status !== "PENDING") {
      throw createError("Only pending bids can be accepted", 409, "BID_NOT_PENDING");
    }

    if (existingBid.listingStatus !== "ACTIVE") {
      throw createError("Listing is not open for bids", 409, "LISTING_NOT_ACTIVE");
    }

    const bid = await acceptBid(
      {
        bidId,
        listingId: existingBid.listingId,
        sellerId: user.id,
      },
      client,
    );

    if (!bid) {
      throw createError("Bid could not be accepted", 409, "BID_ACCEPT_CONFLICT");
    }

    await auditBid({
      actorUserId: user.id,
      action: "PRIVATE_BID_ACCEPTED",
      bid,
      requestMeta,
    }, client);
    await notifyUser(
      {
        userId: bid.jewellerId,
        type: "PRIVATE_BID_ACCEPTED",
        title: "Private bid accepted",
        body: "Your private bid was accepted. Commission settlement is now required before further bidding.",
        entityType: "PRIVATE_BID",
        entityId: bid.id,
      },
      client,
    );
    await Promise.all(
      (bid.autoRejectedBids || []).map((rejectedBid) =>
        notifyUser(
          {
            userId: rejectedBid.jewellerId,
            type: "PRIVATE_BID_REJECTED",
            title: "Private bid not selected",
            body: "Another private bid was accepted for this listing.",
            entityType: "PRIVATE_BID",
            entityId: rejectedBid.id,
          },
          client,
        ),
      ),
    );

    return {
      success: true,
      message: "Bid accepted",
      data: bid,
    };
  });
}

export async function rejectSellerBid({ user, bidId, requestMeta }) {
  assertSeller(user);

  return withTransaction(async (client) => {
    const existingBid = await findBidForSellerDecision(
      { bidId, sellerId: user.id },
      client,
    );

    if (!existingBid) {
      throw createError("Bid not found", 404, "BID_NOT_FOUND");
    }

    if (existingBid.status !== "PENDING") {
      throw createError("Only pending bids can be rejected", 409, "BID_NOT_PENDING");
    }

    const bid = await rejectBid(bidId, client);

    await auditBid({
      actorUserId: user.id,
      action: "PRIVATE_BID_REJECTED",
      bid,
      requestMeta,
    }, client);
    await notifyUser(
      {
        userId: bid.jewellerId,
        type: "PRIVATE_BID_REJECTED",
        title: "Private bid rejected",
        body: "Your private bid was not selected by the seller.",
        entityType: "PRIVATE_BID",
        entityId: bid.id,
      },
      client,
    );

    return {
      success: true,
      message: "Bid rejected",
      data: bid,
    };
  });
}
