import { z } from "zod";

export const geoMatchedListingsQuerySchema = z.object({
  radiusKm: z.coerce.number().positive().max(500).default(50),
  limit: z.coerce.number().int().positive().max(100).optional(),
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
