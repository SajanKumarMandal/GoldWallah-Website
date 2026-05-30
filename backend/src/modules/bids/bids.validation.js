import { z } from "zod";

export const createBidSchema = z.object({
  listingId: z.string().uuid("Invalid listing id"),
  bidAmount: z.coerce.number().positive().max(999999999999.99),
  message: z
    .string()
    .trim()
    .max(1000, "Message must be 1000 characters or less")
    .optional()
    .transform((value) => value || undefined),
});

export const uuidParamSchema = z.object({
  bidId: z.string().uuid("Invalid bid id").optional(),
  listingId: z.string().uuid("Invalid listing id").optional(),
});

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

export function validateParams(schema, params) {
  const result = schema.safeParse(params);

  if (!result.success) {
    const error = new Error("Invalid route parameters");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.details = result.error.flatten().fieldErrors;
    throw error;
  }

  return result.data;
}
