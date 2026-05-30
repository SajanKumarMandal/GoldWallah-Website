import { z } from "zod";

const commissionStatuses = [
  "PENDING",
  "PAYMENT_INITIATED",
  "PAID",
  "FAILED",
  "WAIVED",
  "DISPUTED",
];

export const commissionQuerySchema = z.object({
  status: z.enum(commissionStatuses).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const commissionIdParamSchema = z.object({
  commissionId: z.string().uuid("Invalid commission id"),
});

export const markPaidSchema = z.object({
  razorpayPaymentId: z.string().trim().min(1).max(100).optional(),
});

export const waiveCommissionSchema = z.object({
  reason: z.string().trim().min(10).max(500),
});

function throwValidationError(message, details) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.details = details;
  throw error;
}

export function validateQuery(schema, query) {
  const result = schema.safeParse(query);

  if (!result.success) {
    throwValidationError(
      "Invalid query parameters",
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}

export function validateParams(schema, params) {
  const result = schema.safeParse(params);

  if (!result.success) {
    throwValidationError(
      "Invalid route parameters",
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}

export function validateBody(schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    throwValidationError("Invalid request body", result.error.flatten().fieldErrors);
  }

  return result.data;
}
