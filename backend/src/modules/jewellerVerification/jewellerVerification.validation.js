import { z } from "zod";

const VERIFICATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"];
const BUSINESS_TYPES = [
  "INDIVIDUAL_JEWELLER",
  "JEWELLERY_SHOP",
  "GOLD_DEALER",
  "PAWNBROKER",
  "OTHER",
];

function optionalTrimmedString(schema) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    return typeof value === "string" ? value.trim() : value;
  }, schema.optional());
}

const optionalTime = optionalTrimmedString(
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm format"),
);

export const submitJewellerVerificationSchema = z
  .object({
    shopName: z.string().trim().min(2).max(160),
    ownerName: z.string().trim().min(2).max(160),
    businessMobile: z
      .string()
      .trim()
      .transform((value) => value.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{10,15}$/, "Business mobile must be 10 to 15 digits")),
    businessEmail: optionalTrimmedString(z.string().email().max(255)),
    gstNumber: optionalTrimmedString(
      z
        .string()
        .transform((value) => value.toUpperCase())
        .pipe(
          z.string().regex(
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
            "GST number must be valid",
          ),
        ),
    ),
    shopLicenseNumber: optionalTrimmedString(
      z.string().min(4).max(80).transform((value) => value.toUpperCase()),
    ),
    businessAddress: z.string().trim().min(10).max(1000),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    pincode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Pincode must be 6 digits"),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    shopOpeningTime: optionalTime,
    shopClosingTime: optionalTime,
    yearsInBusiness: z.preprocess((value) => {
      if (value === undefined || value === null || value === "") {
        return undefined;
      }

      return value;
    }, z.coerce.number().int().min(0).max(150).optional()),
    businessType: optionalTrimmedString(z.enum(BUSINESS_TYPES)),
  })
  .refine((data) => data.gstNumber || data.shopLicenseNumber, {
    message: "GST number or shop license number is required",
    path: ["gstNumber"],
  });

export const adminListQuerySchema = z.object({
  status: z.enum(VERIFICATION_STATUSES).optional(),
});

export const approveVerificationSchema = z.object({
  reviewNotes: z.string().trim().min(5).max(1000),
});

export const rejectVerificationSchema = z.object({
  rejectionReason: z.string().trim().min(5).max(1000),
  reviewNotes: z.string().trim().min(5).max(1000).optional(),
});

export const uuidParamSchema = z.object({
  verificationId: z.string().uuid("Invalid verification id"),
});

function createValidationError(message, details) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.details = details;
  return error;
}

export function validateBody(schema, body) {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw createValidationError(
      "Invalid request body",
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}

export function validateQuery(schema, query) {
  const result = schema.safeParse(query);

  if (!result.success) {
    throw createValidationError(
      "Invalid query parameters",
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}

export function validateParams(schema, params) {
  const result = schema.safeParse(params);

  if (!result.success) {
    throw createValidationError(
      "Invalid route parameters",
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}
