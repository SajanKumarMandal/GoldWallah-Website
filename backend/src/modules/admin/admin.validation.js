import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((email) => email.toLowerCase());

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(200, "Password is too long")
  .refine(
    (value) => /[A-Z]/.test(value) && /[a-z]/.test(value),
    "Password must include uppercase and lowercase letters",
  )
  .refine((value) => /\d/.test(value), "Password must include a number")
  .refine(
    (value) => /[^A-Za-z0-9]/.test(value),
    "Password must include a symbol",
  )
  .refine((value) => !/^\s|\s$/.test(value), "Password cannot start or end with spaces");

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  mfaCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "MFA code must be 6 digits")
    .optional(),
});

export const adminRefreshSchema = z.object({
  refreshToken: z.string().trim().min(32, "Refresh token is required"),
});

export const adminLogoutSchema = adminRefreshSchema;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export const beginMfaSetupSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
});

export const confirmMfaSetupSchema = z.object({
  mfaCode: z.string().trim().regex(/^\d{6}$/, "MFA code must be 6 digits"),
});

export const createSubAdminSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: emailSchema,
  password: passwordSchema,
  roleIds: z.array(z.string().uuid()).default([]),
});

export const updateAdminStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "LOCKED"]),
  reason: z.string().trim().min(5).max(1000),
});

export const platformUserQuerySchema = z
  .object({
    role: z.enum(["SELLER", "JEWELLER"]).optional(),
    accountStatus: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]).optional(),
    kycStatus: z
      .enum(["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"])
      .optional(),
    businessVerificationStatus: z
      .enum(["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED"])
      .optional(),
    search: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((value) => value || undefined),
    cursor: z
      .string()
      .trim()
      .max(256)
      .optional()
      .transform((value) => value || undefined),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
  .strict();

export const platformUserIdParamSchema = z.object({
  userId: z.string().uuid("Invalid user id"),
});

export const userAccountActionSchema = z.object({
  reason: z.string().trim().min(5).max(1000),
});

export const adminIdParamSchema = z.object({
  id: z.string().uuid("Invalid admin id"),
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
