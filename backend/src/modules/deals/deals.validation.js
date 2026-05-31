import { z } from "zod";

const DEAL_STATUSES = [
  "COMMISSION_PENDING",
  "READY_TO_SETTLE",
  "COMPLETED",
  "CANCELLED",
];

export const dealQuerySchema = z.object({
  status: z.enum(DEAL_STATUSES).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const dealParamSchema = z.object({
  dealId: z.string().uuid("Invalid deal id"),
});

function validationError(message, details) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.details = details;
  return error;
}

export function validateQuery(schema, query) {
  const result = schema.safeParse(query);

  if (!result.success) {
    throw validationError(
      "Invalid query parameters",
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}

export function validateParams(schema, params) {
  const result = schema.safeParse(params);

  if (!result.success) {
    throw validationError(
      "Invalid route parameters",
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}
