import { z } from "zod";

const commissionStatuses = [
  "PENDING",
  "PAYMENT_INITIATED",
  "PAID",
  "FAILED",
  "WAIVED",
  "DISPUTED",
];

export const commissionQuerySchema = z
  .object({
    status: z.enum(commissionStatuses).optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

export const commissionIdParamSchema = z.object({
  commissionId: z.string().uuid("Invalid commission id"),
});

export const submitPaymentSchema = z
  .object({
    paymentReference: z
      .string()
      .trim()
      .min(4)
      .max(100)
      .regex(/^[a-zA-Z0-9._:@/-]+$/, "Invalid payment reference"),
    paymentNote: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((value) => value || undefined),
  })
  .strict();

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
