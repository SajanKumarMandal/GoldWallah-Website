import { z } from "zod";

export const AUTH_ROLES = {
  seller: "SELLER",
  jeweller: "JEWELLER",
};

const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid Indian phone number");

const emailSchema = z.string().trim().email().transform((email) => email.toLowerCase());
const roleSchema = z.enum([AUTH_ROLES.seller, AUTH_ROLES.jeweller]);
const otpSchema = z.string().trim().regex(/^(\d{4}|\d{6})$/, "OTP must be 4 or 6 digits");

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  email: emailSchema,
  phone: indianPhoneSchema,
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const sendOtpSchema = z.object({
  phone: indianPhoneSchema,
});

export const verifyLoginOtpSchema = z.object({
  phone: indianPhoneSchema,
  otp: otpSchema,
});

export const verifyRegisterOtpSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  phone: indianPhoneSchema,
  role: roleSchema,
  otp: otpSchema,
});

export const googleLoginSchema = z.object({
  idToken: z.string().trim().min(1, "Google idToken is required"),
});

export const googleRegisterSchema = googleLoginSchema.extend({
  role: roleSchema,
});

export const facebookLoginSchema = z.object({
  accessToken: z.string().trim().min(1, "Facebook accessToken is required"),
});

export const facebookRegisterSchema = facebookLoginSchema.extend({
  role: roleSchema,
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

export function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}
