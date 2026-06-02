import { z } from "zod";

const KYC_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

const isoDateTimeSchema = z
  .string()
  .trim()
  .datetime({ message: "Selfie captured time must be a valid ISO datetime" });

export const sellerKycSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(150, "Full name must be 150 characters or fewer"),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),
  addressAsPerAadhaar: z
    .string()
    .trim()
    .min(10, "Address as per Aadhaar must be at least 10 characters")
    .max(500, "Address as per Aadhaar must be 500 characters or fewer"),
  aadhaarNumber: z
    .string()
    .trim()
    .regex(/^\d{12}$/, "Aadhaar number must be 12 digits"),
  panNumber: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN number must be valid")),
  selfieCapturedAt: isoDateTimeSchema,
});

export const adminKycListQuerySchema = z.object({
  status: z.enum(KYC_STATUSES).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const rejectKycSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(1, "Rejection reason is required")
    .max(1000),
});

export const uuidParamSchema = z.object({
  kycId: z.string().uuid("Invalid KYC id"),
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
