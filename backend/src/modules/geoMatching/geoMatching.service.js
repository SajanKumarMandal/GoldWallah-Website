import { requireJewellerCanTransact } from "../jewellerVerification/jewellerTransactionGuard.js";
import {
  findApprovedJewellerLocation,
  listMatchedListings,
} from "./geoMatching.repository.js";

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export async function getMatchedListings({ user, query }) {
  requireJewellerCanTransact(user);

  const location = await findApprovedJewellerLocation(user.id);

  if (!location) {
    throw createError(
      "Approved business verification location is required for geo matching.",
      403,
      "BUSINESS_LOCATION_REQUIRED",
    );
  }

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
