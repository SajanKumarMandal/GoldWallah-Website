import "dotenv/config";

import fs from "node:fs";

import { z } from "zod";

const optionalUrl = z.union([z.string().url(), z.literal("")]).default("");

// All environment variables are validated at boot so production fails fast
// instead of silently falling back to unsafe defaults.
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  BACKEND_PUBLIC_URL: optionalUrl,
  API_VERSION: z.string().min(1).default("v1"),
  DATABASE_URL: z.string().optional().default(""),
  JWT_ACCESS_SECRET: z.string().optional().default(""),
  JWT_REFRESH_SECRET: z.string().optional().default(""),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("7d"),
  AUTH_COOKIE_DOMAIN: z.string().optional().default(""),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().positive().default(12),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  FACEBOOK_APP_ID: z.string().optional().default(""),
  FACEBOOK_APP_SECRET: z.string().optional().default(""),
  OTP_PROVIDER: z.enum(["mock", "msg91", "twilio"]).default("mock"),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  MSG91_AUTH_KEY: z.string().optional().default(""),
  MSG91_TEMPLATE_ID: z.string().optional().default(""),
  MSG91_SENDER_ID: z.string().optional().default(""),
  TWILIO_ACCOUNT_SID: z.string().optional().default(""),
  TWILIO_AUTH_TOKEN: z.string().optional().default(""),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional().default(""),
  TWILIO_FROM_PHONE: z.string().optional().default(""),
  KYC_ENCRYPTION_KEY: z.string().optional().default(""),
  PRIVATE_MEDIA_SIGNING_SECRET: z.string().optional().default(""),
  PG_SSL_CA: z.string().optional().default(""),
  PG_SSL_CA_FILE: z.string().optional().default(""),
  ADMIN_JWT_ACCESS_SECRET: z.string().optional().default(""),
  ADMIN_ACCESS_TOKEN_TTL: z.string().min(1).default("15m"),
  ADMIN_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  ADMIN_SEED_EMAIL: z.string().optional().default(""),
  ADMIN_SEED_PASSWORD: z.string().optional().default(""),
  ADMIN_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  ADMIN_LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  UPLOAD_STORAGE_PROVIDER: z.enum(["local", "cloudinary"]).default("local"),
  CLOUDINARY_CLOUD_NAME: z.string().trim().optional().default(""),
  CLOUDINARY_API_KEY: z.string().trim().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().trim().optional().default(""),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid backend environment configuration");
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV !== "test" &&
  !parsedEnv.data.KYC_ENCRYPTION_KEY
) {
  console.error("Missing required environment variable: KYC_ENCRYPTION_KEY");
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV !== "test" &&
  !parsedEnv.data.JWT_ACCESS_SECRET
) {
  console.error("Missing required environment variable: JWT_ACCESS_SECRET");
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV !== "test" &&
  !parsedEnv.data.JWT_REFRESH_SECRET
) {
  console.error("Missing required environment variable: JWT_REFRESH_SECRET");
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV !== "test" &&
  !parsedEnv.data.ADMIN_JWT_ACCESS_SECRET
) {
  console.error("Missing required environment variable: ADMIN_JWT_ACCESS_SECRET");
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  !parsedEnv.data.PRIVATE_MEDIA_SIGNING_SECRET
) {
  console.error("Missing required environment variable: PRIVATE_MEDIA_SIGNING_SECRET");
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  parsedEnv.data.OTP_PROVIDER === "mock"
) {
  // Mock OTP is only for local development and test fixtures.
  console.error("OTP_PROVIDER=mock is not allowed in production");
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  parsedEnv.data.UPLOAD_STORAGE_PROVIDER !== "cloudinary"
) {
  console.error(
    "UPLOAD_STORAGE_PROVIDER=cloudinary is required in production",
  );
  process.exit(1);
}

if (
  parsedEnv.data.UPLOAD_STORAGE_PROVIDER === "cloudinary" &&
  (
    !parsedEnv.data.CLOUDINARY_CLOUD_NAME ||
    !parsedEnv.data.CLOUDINARY_API_KEY ||
    !parsedEnv.data.CLOUDINARY_API_SECRET
  )
) {
  console.error(
    "Cloudinary storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET",
  );
  process.exit(1);
}

function readPgSslCa() {
  // Production PostgreSQL SSL can receive the provider CA directly or from a file.
  if (parsedEnv.data.PG_SSL_CA) {
    return parsedEnv.data.PG_SSL_CA.replace(/\\n/g, "\n");
  }

  if (parsedEnv.data.PG_SSL_CA_FILE) {
    return fs.readFileSync(parsedEnv.data.PG_SSL_CA_FILE, "utf8");
  }

  return undefined;
}

export const env = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  frontendOrigin: parsedEnv.data.FRONTEND_ORIGIN || parsedEnv.data.FRONTEND_URL,
  frontendUrl: parsedEnv.data.FRONTEND_URL,
  backendPublicUrl: parsedEnv.data.BACKEND_PUBLIC_URL,
  apiVersion: parsedEnv.data.API_VERSION,
  databaseUrl: parsedEnv.data.DATABASE_URL,
  jwtAccessSecret: parsedEnv.data.JWT_ACCESS_SECRET,
  jwtRefreshSecret: parsedEnv.data.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: parsedEnv.data.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: parsedEnv.data.JWT_REFRESH_EXPIRES_IN,
  authCookieDomain: parsedEnv.data.AUTH_COOKIE_DOMAIN,
  bcryptSaltRounds: parsedEnv.data.BCRYPT_SALT_ROUNDS,
  googleClientId: parsedEnv.data.GOOGLE_CLIENT_ID,
  googleClientSecret: parsedEnv.data.GOOGLE_CLIENT_SECRET,
  facebookAppId: parsedEnv.data.FACEBOOK_APP_ID,
  facebookAppSecret: parsedEnv.data.FACEBOOK_APP_SECRET,
  otpProvider: parsedEnv.data.OTP_PROVIDER,
  otpExpiryMinutes: parsedEnv.data.OTP_EXPIRY_MINUTES,
  otpResendCooldownSeconds: parsedEnv.data.OTP_RESEND_COOLDOWN_SECONDS,
  msg91AuthKey: parsedEnv.data.MSG91_AUTH_KEY,
  msg91TemplateId: parsedEnv.data.MSG91_TEMPLATE_ID,
  msg91SenderId: parsedEnv.data.MSG91_SENDER_ID,
  twilioAccountSid: parsedEnv.data.TWILIO_ACCOUNT_SID,
  twilioAuthToken: parsedEnv.data.TWILIO_AUTH_TOKEN,
  twilioVerifyServiceSid: parsedEnv.data.TWILIO_VERIFY_SERVICE_SID,
  twilioFromPhone: parsedEnv.data.TWILIO_FROM_PHONE,
  kycEncryptionKey: parsedEnv.data.KYC_ENCRYPTION_KEY,
  privateMediaSigningSecret:
    parsedEnv.data.PRIVATE_MEDIA_SIGNING_SECRET ||
    parsedEnv.data.JWT_ACCESS_SECRET,
  pgSslCa: readPgSslCa(),
  adminJwtAccessSecret: parsedEnv.data.ADMIN_JWT_ACCESS_SECRET,
  adminAccessTokenTtl: parsedEnv.data.ADMIN_ACCESS_TOKEN_TTL,
  adminRefreshTokenTtlDays: parsedEnv.data.ADMIN_REFRESH_TOKEN_TTL_DAYS,
  adminSeedEmail: parsedEnv.data.ADMIN_SEED_EMAIL,
  adminSeedPassword: parsedEnv.data.ADMIN_SEED_PASSWORD,
  adminLoginMaxAttempts: parsedEnv.data.ADMIN_LOGIN_MAX_ATTEMPTS,
  adminLoginLockMinutes: parsedEnv.data.ADMIN_LOGIN_LOCK_MINUTES,
  uploadStorageProvider: parsedEnv.data.UPLOAD_STORAGE_PROVIDER,
  cloudinaryCloudName: parsedEnv.data.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: parsedEnv.data.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: parsedEnv.data.CLOUDINARY_API_SECRET,
  isProduction: parsedEnv.data.NODE_ENV === "production",
};
