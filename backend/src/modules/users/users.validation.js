import { z } from "zod";

function requiredCoordinate({ min, max }) {
  return z.preprocess((value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? Number(trimmed) : undefined;
    }

    return value;
  }, z.number().finite().min(min).max(max));
}

export const updateLocationSchema = z
  .object({
    latitude: requiredCoordinate({ min: -90, max: 90 }),
    longitude: requiredCoordinate({ min: -180, max: 180 }),
  })
  .strict();

export function validateBody(schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    const error = new Error("Invalid request body");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.details = result.error.flatten().fieldErrors;
    throw error;
  }

  return result.data;
}
