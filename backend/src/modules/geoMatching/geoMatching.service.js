import { requireJewellerCanTransact } from "../jewellerVerification/jewellerTransactionGuard.js";
import {
  findApprovedJewellerLocation,
  findSellerListingLocation,
  listNearbyJewellersForSeller,
  listMatchedListings,
} from "./geoMatching.repository.js";

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function hasQueryCoordinates(query) {
  return Number.isFinite(query.latitude) && Number.isFinite(query.longitude);
}

function withQueryCoordinates(location, query) {
  if (!hasQueryCoordinates(query)) {
    return location;
  }

  return {
    ...(location || {}),
    city: location?.city || null,
    state: location?.state || null,
    latitude: query.latitude,
    longitude: query.longitude,
  };
}

export async function getMatchedListings({ user, query }) {
  requireJewellerCanTransact(user);

  const businessLocation = await findApprovedJewellerLocation(user.id);

  if (!businessLocation) {
    throw createError(
      "Approved business verification location is required for geo matching.",
      403,
      "BUSINESS_LOCATION_REQUIRED",
    );
  }

  const location = withQueryCoordinates(businessLocation, query);

  return {
    success: true,
    data: await listMatchedListings({
      location,
      radiusKm: query.radiusKm,
      limit: query.limit,
    }),
    meta: {
      origin: location,
      radiusKm: query.radiusKm,
    },
  };
}

export async function getNearbyJewellers({ user, query }) {
  if (user.role !== "SELLER") {
    throw createError("Seller role is required", 403, "SELLER_ROLE_REQUIRED");
  }

  const listingLocation = await findSellerListingLocation({
    sellerId: user.id,
    listingId: query.listingId,
  });
  const location = withQueryCoordinates(listingLocation, query);

  if (!location) {
    return {
      success: true,
      data: [],
      meta: {
        origin: null,
        radiusKm: query.radiusKm,
      },
    };
  }

  return {
    success: true,
    data: await listNearbyJewellersForSeller({
      location,
      radiusKm: query.radiusKm,
      limit: query.limit,
    }),
    meta: {
      origin: location,
      radiusKm: query.radiusKm,
    },
  };
}
