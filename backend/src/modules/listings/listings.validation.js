import { z } from "zod";

const GOLD_TYPES = ["JEWELLERY", "COIN", "BAR", "SCRAP", "OTHER"];
const PURITIES = ["24K", "22K", "18K", "14K", "UNKNOWN"];
const CONDITIONS = ["NEW", "USED", "DAMAGED", "OLD", "UNKNOWN"];
const LISTING_STATUSES = ["ACTIVE", "BID_ACCEPTED", "SOLD", "CANCELLED"];
const limitQuery = z.coerce.number().int().positive().max(100).optional();

function optionalNumber(schema) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    return value;
  }, schema.optional());
}

function optionalTrimmedString(maxLength) {
  return z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }, z.string().max(maxLength).optional());
}

const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return value;
}, z.boolean().optional());

const currentYear = new Date().getFullYear();

const editableListingFields = {
  title: z.string().trim().min(3).max(160),
  goldType: z.enum(GOLD_TYPES),
  purity: z.enum(PURITIES),
  weightGrams: z.coerce.number().positive().max(99999999.99),
  expectedPrice: optionalNumber(z.coerce.number().positive()),
  description: optionalTrimmedString(2000),
  condition: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }, z.enum(CONDITIONS).optional()),
  hallmarkAvailable: optionalBoolean.default(false),
  billAvailable: optionalBoolean.default(false),
  purchaseYear: optionalNumber(
    z.coerce.number().int().min(1900).max(currentYear),
  ),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  latitude: optionalNumber(z.coerce.number().min(-90).max(90)),
  longitude: optionalNumber(z.coerce.number().min(-180).max(180)),
};

export const createListingSchema = z.object(editableListingFields);

export const updateListingSchema = z
  .object({
    ...editableListingFields,
    hallmarkAvailable: optionalBoolean,
    billAvailable: optionalBoolean,
  })
  .partial()
  .strict();

export const listingStatusQuerySchema = z.object({
  status: z.enum(LISTING_STATUSES).optional(),
  limit: limitQuery,
});

export const marketplaceListingQuerySchema = z.object({
  city: optionalTrimmedString(100),
  state: optionalTrimmedString(100),
  limit: limitQuery,
});

export const uuidParamSchema = z.object({
  listingId: z.string().uuid("Invalid listing id"),
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
