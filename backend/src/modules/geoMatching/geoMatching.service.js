import { requireJewellerCanTransact } from "../jewellerVerification/jewellerTransactionGuard.js";
import {
  findApprovedJewellerLocation,
  findSellerListingLocation,
  findUserProfileLocation,
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

function assertValidCursor(query) {
  if (
    (query.lastDistance === undefined) !== (query.lastId === undefined)
  ) {
    throw createError(
      "Both lastDistance and lastId are required for cursor pagination.",
      400,
      "INVALID_CURSOR",
    );
  }
}

export async function getMatchedListings({ user, query }) {
  assertValidCursor(query);
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

  const result = await listMatchedListings({
    location,
    radiusKm: query.radiusKm,
    limit: query.limit,
    lastDistance: query.lastDistance,
    lastId: query.lastId,
  });

  return {
    success: true,
    data: result.items,
    meta: {
      origin: location,
      radiusKm: query.radiusKm,
      nextCursor: result.nextCursor,
      fallbackApplied: result.items.some((item) => item.matchMode !== "RADIUS"),
    },
  };
}

export async function getNearbyJewellers({ user, query }) {
  assertValidCursor(query);
  if (user.role !== "SELLER") {
    throw createError("Seller role is required", 403, "SELLER_ROLE_REQUIRED");
  }

  const profileLocation = await findUserProfileLocation(user.id);
  const listingLocation = await findSellerListingLocation({
    sellerId: user.id,
    listingId: query.listingId,
  });
  const location = withQueryCoordinates(profileLocation || listingLocation, query) || {
    city: null,
    state: null,
    latitude: null,
    longitude: null,
  };

  const result = await listNearbyJewellersForSeller({
    location,
    radiusKm: query.radiusKm,
    limit: query.limit,
    lastDistance: query.lastDistance,
    lastId: query.lastId,
  });

  return {
    success: true,
    data: result.items,
    meta: {
      origin: location,
      radiusKm: query.radiusKm,
      nextCursor: result.nextCursor,
      fallbackApplied: result.items.some((item) => item.matchMode !== "RADIUS"),
    },
  };
}
