import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((email) => email.toLowerCase());

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(200, "Password is too long");

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const adminRefreshSchema = z.object({
  refreshToken: z.string().trim().min(32, "Refresh token is required"),
});

export const adminLogoutSchema = adminRefreshSchema;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
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
