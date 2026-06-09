import { z } from "zod";

export const AUTH_ROLES = {
  seller: "SELLER",
  jeweller: "JEWELLER",
};

// Zod schemas define the server-side contract for all auth request bodies.
const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid Indian phone number");

const emailSchema = z.string().trim().email().transform((email) => email.toLowerCase());
const roleSchema = z.enum([AUTH_ROLES.seller, AUTH_ROLES.jeweller]);
const otpSchema = z.string().trim().regex(/^(\d{4}|\d{6})$/, "OTP must be 4 or 6 digits");
const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Full name is required")
  .max(120, "Full name is too long")
  .regex(/^[\p{L}\p{M}.' -]+$/u, "Full name contains unsupported characters");
const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password is too long")
  .refine((value) => !/^\s|\s$/.test(value), "Password cannot start or end with spaces");
const tokenSchema = z.string().trim().min(32, "Token is required").max(256, "Token is invalid");

// Email registration requires full identity/contact details plus a password.
export const registerSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: indianPhoneSchema,
  password: passwordSchema,
  role: roleSchema,
});

// Login keeps the public error generic in the service, but still validates shape here.
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// OTP send accepts only a phone number; purpose is decided by route/service.
export const sendOtpSchema = z.object({
  phone: indianPhoneSchema,
});

// OTP login verifies the submitted OTP against the existing account phone.
export const verifyLoginOtpSchema = z.object({
  phone: indianPhoneSchema,
  otp: otpSchema,
});

// OTP registration creates a user only after fullName, phone, role, and OTP pass.
export const verifyRegisterOtpSchema = z.object({
  fullName: fullNameSchema,
  phone: indianPhoneSchema,
  role: roleSchema,
  otp: otpSchema,
});

// Social login accepts provider tokens only; backend provider modules verify them.
export const googleLoginSchema = z.object({
  idToken: z.string().trim().min(1, "Google idToken is required"),
});

// Social registration adds the GoldWallah role gate to provider identity.
export const googleRegisterSchema = googleLoginSchema.extend({
  role: roleSchema,
});

export const facebookLoginSchema = z.object({
  accessToken: z.string().trim().min(1, "Facebook accessToken is required"),
});

export const facebookRegisterSchema = facebookLoginSchema.extend({
  role: roleSchema,
});

// Refresh/logout validate token shape after the controller reads the HttpOnly cookie.
export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(32, "Refresh token is required"),
});

export const logoutSchema = refreshSchema;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: tokenSchema,
  newPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: tokenSchema,
});

export const sendPhoneVerificationSchema = z.object({
  phone: indianPhoneSchema.optional(),
});

export const verifyPhoneSchema = z.object({
  phone: indianPhoneSchema,
  otp: otpSchema,
});

export function validateBody(schema, body) {
  // Convert validation failures into structured API errors without exposing raw
  // parser internals to clients.
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

export function normalizePhone(phone) {
  // Store Indian mobile numbers consistently without country-code punctuation.
  const digits = phone.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}
