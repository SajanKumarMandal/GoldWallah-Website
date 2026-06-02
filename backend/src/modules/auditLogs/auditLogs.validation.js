import { z } from "zod";

const severityValues = ["INFO", "WARNING", "CRITICAL"];

function optionalTrimmedString(maxLength) {
  return z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed || undefined;
  }, z.string().max(maxLength).optional());
}

const optionalDateString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}, z.string().max(40).optional().refine((value) => {
  if (!value) {
    return true;
  }

  return !Number.isNaN(Date.parse(value));
}, "Invalid date"));

export const auditLogQuerySchema = z
  .object({
    severity: z.enum(severityValues).optional(),
    action: optionalTrimmedString(100),
    resourceType: optionalTrimmedString(80),
    actorAdminId: z.string().uuid("Invalid actor admin id").optional(),
    actorUserId: z.string().uuid("Invalid actor user id").optional(),
    source: z.enum(["ADMIN", "USER"]).optional(),
    from: optionalDateString,
    to: optionalDateString,
    cursor: optionalTrimmedString(256),
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
