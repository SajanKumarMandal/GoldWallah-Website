import { withTransaction } from "../../config/db.js";
import { rejectPendingBidsForListing } from "../bids/bids.repository.js";
import {
  cancelListing,
  createListing,
  deleteListingImages,
  findActiveMarketplaceListingById,
  findListingById,
  getListingOwnershipAndStatus,
  insertListingImages,
  listActiveMarketplaceListings,
  listSellerListings,
  updateListingFields,
} from "./listings.repository.js";
import { requireJewellerCanTransact } from "../jewellerVerification/jewellerTransactionGuard.js";
import { notifyUser } from "../notifications/notifications.service.js";

// Listing service. Approved sellers create/manage gold listings; verified
// jewellers read active listings and place private bids through the bid module.
function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function assertApprovedSeller(user) {
  if (user.role !== "SELLER") {
    throw createError("Forbidden", 403, "FORBIDDEN");
  }

  if (user.kycStatus !== "APPROVED") {
    throw createError(
      "KYC approval is required before listing gold.",
      403,
      "KYC_REQUIRED",
    );
  }
}

function assertListingOwner(listing, user) {
  if (!listing) {
    throw createError("Listing not found", 404, "LISTING_NOT_FOUND");
  }

  if (listing.sellerId !== user.id) {
    throw createError("You do not have access to this listing", 403, "NOT_LISTING_OWNER");
  }
}

function assertActiveListing(listing, action) {
  if (listing.status !== "ACTIVE") {
    throw createError(
      `Listing cannot be ${action} after status changes.`,
      409,
      "LISTING_NOT_ACTIVE",
    );
  }
}

async function throwListingMutationError({ listingId, user, action, client }) {
  const listing = await getListingOwnershipAndStatus(listingId, client);

  assertListingOwner(listing, user);
  assertActiveListing(listing, action);

  throw createError("Listing could not be changed", 409, "LISTING_UPDATE_CONFLICT");
}

export async function createSellerListing({ user, payload, imageUrls }) {
  // Listing images are public product media. Identity/business documents use the
  // private media module and are never exposed here.
  assertApprovedSeller(user);

  return withTransaction(async (client) => {
    const listing = await createListing(
      {
        ...payload,
        sellerId: user.id,
      },
      client,
    );
    const images = await insertListingImages(listing.id, imageUrls, client);

    return {
      success: true,
      message: "Listing created",
      data: {
        ...listing,
        images,
      },
    };
  });
}

export async function getMySellerListings({ user, filters }) {
  if (user.role !== "SELLER") {
    throw createError("Forbidden", 403, "FORBIDDEN");
  }

  return {
    success: true,
    data: await listSellerListings({
      sellerId: user.id,
      status: filters.status,
    }),
  };
}

export async function getSellerListingDetail({ user, listingId }) {
  if (user.role !== "SELLER") {
    throw createError("Forbidden", 403, "FORBIDDEN");
  }

  const listing = await findListingById(listingId);
  assertListingOwner(listing, user);

  return {
    success: true,
    data: listing,
  };
}

export async function getMarketplaceListings({ user, filters }) {
  requireJewellerCanTransact(user);

  return {
    success: true,
    data: await listActiveMarketplaceListings(filters),
  };
}

export async function getMarketplaceListingDetail({ user, listingId }) {
  requireJewellerCanTransact(user);

  const listing = await findActiveMarketplaceListingById(listingId);

  if (!listing) {
    throw createError("Listing not found", 404, "LISTING_NOT_FOUND");
  }

  return {
    success: true,
    data: listing,
  };
}

export async function updateSellerListing({
  user,
  listingId,
  payload,
  imageUrls,
}) {
  if (user.role !== "SELLER") {
    throw createError("Forbidden", 403, "FORBIDDEN");
  }

  if (Object.keys(payload).length === 0 && !imageUrls) {
    throw createError("No listing changes were provided", 400, "NO_CHANGES");
  }

  let oldImages = [];
  const listing = await withTransaction(async (client) => {
    const updatedListing = await updateListingFields(
      {
        id: listingId,
        sellerId: user.id,
        data: payload,
      },
      client,
    );

    if (!updatedListing) {
      await throwListingMutationError({
        listingId,
        user,
        action: "updated",
        client,
      });
    }

    if (imageUrls) {
      oldImages = await deleteListingImages(listingId, client);
      const images = await insertListingImages(listingId, imageUrls, client);
      return {
        ...updatedListing,
        images,
      };
    }

    return updatedListing;
  });

  return {
    success: true,
    message: "Listing updated",
    data: listing,
    oldImages,
  };
}

export async function cancelSellerListing({ user, listingId }) {
  if (user.role !== "SELLER") {
    throw createError("Forbidden", 403, "FORBIDDEN");
  }

  return withTransaction(async (client) => {
    const listing = await cancelListing(
      {
        id: listingId,
        sellerId: user.id,
      },
      client,
    );

    if (!listing) {
      await throwListingMutationError({
        listingId,
        user,
        action: "cancelled",
        client,
      });
    }

    const rejectedBids = await rejectPendingBidsForListing(listing.id, client);

    for (const bid of rejectedBids) {
      await notifyUser(
        {
          userId: bid.jewellerId,
          type: "BID_REJECTED",
          title: "Listing cancelled",
          body: "A seller cancelled a listing with one of your pending bids.",
          entityType: "GOLD_LISTING",
          entityId: listing.id,
        },
        client,
      );
    }

    return {
      success: true,
      message: "Listing cancelled",
      data: {
        ...listing,
        rejectedBidCount: rejectedBids.length,
      },
    };
  });
}
