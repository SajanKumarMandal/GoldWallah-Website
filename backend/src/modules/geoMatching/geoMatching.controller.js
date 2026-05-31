import {
  getMatchedListings,
  getNearbyJewellers,
} from "./geoMatching.service.js";
import {
  geoMatchedListingsQuerySchema,
  nearbyJewellersQuerySchema,
  validateQuery,
} from "./geoMatching.validation.js";

export async function matchedListings(request, response, next) {
  try {
    const query = validateQuery(geoMatchedListingsQuerySchema, request.query);
    response.status(200).json(
      await getMatchedListings({
        user: request.user,
        query,
      }),
    );
  } catch (error) {
    next(error);
  }
}

export async function nearbyJewellers(request, response, next) {
  try {
    const query = validateQuery(nearbyJewellersQuerySchema, request.query);
    response.status(200).json(
      await getNearbyJewellers({
        user: request.user,
        query,
      }),
    );
  } catch (error) {
    next(error);
  }
}
