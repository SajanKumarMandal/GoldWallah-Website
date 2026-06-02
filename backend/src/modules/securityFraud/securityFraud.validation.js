import { z } from "zod";

export const securityAlertQuerySchema = z
  .object({
    severity: z.enum(["WARNING", "CRITICAL"]).optional(),
    periodHours: z.coerce.number().int().positive().max(168).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

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
