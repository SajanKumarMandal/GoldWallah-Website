import { z } from "zod";

// Shared admin email normalization for login, sub-admin creation, and lookup.
const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((email) => email.toLowerCase());

// Admin passwords are intentionally stronger than normal user passwords because
// admin accounts can view sensitive verification and platform data.
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

// Admin login accepts optional MFA for accounts where MFA is enabled/required.
export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  mfaCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "MFA code must be 6 digits")
    .optional(),
  recoveryCode: z
    .string()
    .trim()
    .min(8, "Recovery code is invalid")
    .max(80, "Recovery code is invalid")
    .regex(/^[A-Za-z0-9_-]+(?:-[A-Za-z0-9_-]+)*$/, "Recovery code is invalid")
    .optional(),
}).refine((payload) => !(payload.mfaCode && payload.recoveryCode), {
  message: "Provide either MFA code or recovery code",
  path: ["recoveryCode"],
});

// Refresh/logout validate the HttpOnly cookie value after the controller reads it.
export const adminRefreshSchema = z.object({
  refreshToken: z.string().trim().min(32, "Refresh token is required"),
});

export const adminLogoutSchema = adminRefreshSchema;

// Forced password change and manual password updates use the same strength policy.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

// MFA setup starts only after current password confirmation.
export const beginMfaSetupSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
});

// MFA confirmation requires a six-digit TOTP code.
export const confirmMfaSetupSchema = z.object({
  mfaCode: z.string().trim().regex(/^\d{6}$/, "MFA code must be 6 digits"),
});

// Sub-admin creation shares admin password policy and assigns explicit RBAC roles.
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
  // Normalize Zod failures into the app's structured validation error format.
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.details = details;
  return error;
}

export function validateBody(schema, body) {
  // Validate JSON request bodies before service-layer auth/RBAC logic runs.
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
  // Validate route params such as admin/user UUIDs before repository calls.
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
  // Validate admin list filters and pagination before querying.
  const result = schema.safeParse(query);

  if (!result.success) {
    throw createValidationError(
      "Invalid query parameters",
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}
