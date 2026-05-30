import { getMatchedListings } from "./geoMatching.service.js";
import {
  geoMatchedListingsQuerySchema,
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
