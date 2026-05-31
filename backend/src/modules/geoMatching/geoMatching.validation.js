import { z } from "zod";

function optionalCoordinate(schema) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    return value;
  }, schema.optional());
}

const coordinateQuery = {
  latitude: optionalCoordinate(z.coerce.number().min(-90).max(90)),
  longitude: optionalCoordinate(z.coerce.number().min(-180).max(180)),
};

export const geoMatchedListingsQuerySchema = z.object({
  ...coordinateQuery,
  radiusKm: z.coerce.number().positive().max(500).default(50),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const nearbyJewellersQuerySchema = z.object({
  ...coordinateQuery,
  listingId: z.string().uuid("Invalid listing id").optional(),
  radiusKm: z.coerce.number().positive().max(500).default(50),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export function validateQuery(schema, query) {
  const result = schema.safeParse(query);

  if (!result.success) {
    const error = new Error("Invalid query parameters");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.details = result.error.flatten().fieldErrors;
    throw error;
  }

  return result.data;
}
