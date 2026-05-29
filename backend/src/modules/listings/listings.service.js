import { withTransaction } from "../../config/db.js";
import {
  cancelListing,
  createListing,
  deleteListingImages,
  findListingById,
  getListingOwnershipAndStatus,
  insertListingImages,
  listSellerListings,
  updateListingFields,
} from "./listings.repository.js";

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

    return {
      success: true,
      message: "Listing cancelled",
      data: listing,
    };
  });
}
