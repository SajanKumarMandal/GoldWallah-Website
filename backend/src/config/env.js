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
  CSRF_SECRET: z.string().optional().default(""),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().positive().default(12),
  PASSWORD_RESET_EXPIRY_MINUTES: z.coerce.number().int().positive().default(15),
  EMAIL_VERIFICATION_EXPIRY_HOURS: z.coerce.number().int().positive().default(24),
  AUTH_LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().default(5),
  AUTH_LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  EMAIL_PROVIDER: z.enum(["mock", "smtp"]).default("mock"),
  EMAIL_FROM: z.string().trim().optional().default(""),
  SMTP_HOST: z.string().trim().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  FACEBOOK_APP_ID: z.string().optional().default(""),
  FACEBOOK_APP_SECRET: z.string().optional().default(""),
  OTP_PROVIDER: z.enum(["mock", "msg91", "twilio"]).default("mock"),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  OTP_RATE_LIMIT_HASH_SECRET: z.string().optional().default(""),
  MSG91_AUTH_KEY: z.string().optional().default(""),
  MSG91_TEMPLATE_ID: z.string().optional().default(""),
  MSG91_SENDER_ID: z.string().optional().default(""),
  TWILIO_ACCOUNT_SID: z.string().optional().default(""),
  TWILIO_AUTH_TOKEN: z.string().optional().default(""),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional().default(""),
  TWILIO_FROM_PHONE: z.string().optional().default(""),
  KYC_ENCRYPTION_KEY: z.string().optional().default(""),
  KYC_IDENTITY_HASH_SECRET: z.string().optional().default(""),
  PRIVATE_MEDIA_SIGNING_SECRET: z.string().optional().default(""),
  PG_SSL_CA: z.string().optional().default(""),
  PG_SSL_CA_FILE: z.string().optional().default(""),
  ADMIN_JWT_ACCESS_SECRET: z.string().optional().default(""),
  ADMIN_ACCESS_TOKEN_TTL: z.string().min(1).default("15m"),
  ADMIN_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  ADMIN_MFA_REQUIRED: z.enum(["true", "false"]).default("false"),
  ADMIN_SEED_EMAIL: z.string().optional().default(""),
  ADMIN_SEED_PASSWORD: z.string().optional().default(""),
  ADMIN_SEED_MFA_SECRET: z.string().optional().default(""),
  ADMIN_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  ADMIN_LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  UPLOAD_STORAGE_PROVIDER: z.enum(["local", "cloudinary"]).default("local"),
  CLOUDINARY_CLOUD_NAME: z.string().trim().optional().default(""),
  CLOUDINARY_API_KEY: z.string().trim().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().trim().optional().default(""),
  REDIS_URL: z.string().url().optional().default(""),
  BULLMQ_WORKER_ENABLED: z.enum(["true", "false"]).default("true"),
  NOTIFICATION_QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(5),
  NOTIFICATION_STREAM_HEARTBEAT_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(25),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid backend environment configuration");
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

const hasTwilioProvider = parsedEnv.data.OTP_PROVIDER === "twilio";
const hasTwilioVerifyService = Boolean(parsedEnv.data.TWILIO_VERIFY_SERVICE_SID);
const hasTwilioDirectSmsSender = Boolean(parsedEnv.data.TWILIO_FROM_PHONE);
const minimumJwtSecretLength = 32;
const maximumAccessTokenTtlSeconds = 60 * 60;
const maximumRefreshTokenTtlSeconds = 30 * 24 * 60 * 60;

function parseJwtTtlSeconds(value) {
  const match = /^(\d+)([smhd])$/i.exec(value.trim());

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return null;
  }

  const multipliers = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return amount * multipliers[match[2].toLowerCase()];
}

function validateJwtTtl(name, value, maximumSeconds) {
  const seconds = parseJwtTtlSeconds(value);

  if (!seconds) {
    console.error(`${name} must use a positive duration with s, m, h, or d suffix`);
    process.exit(1);
  }

  if (seconds > maximumSeconds) {
    console.error(`${name} exceeds the maximum allowed auth token lifetime`);
    process.exit(1);
  }
}

validateJwtTtl(
  "JWT_ACCESS_EXPIRES_IN",
  parsedEnv.data.JWT_ACCESS_EXPIRES_IN,
  maximumAccessTokenTtlSeconds,
);
validateJwtTtl(
  "JWT_REFRESH_EXPIRES_IN",
  parsedEnv.data.JWT_REFRESH_EXPIRES_IN,
  maximumRefreshTokenTtlSeconds,
);

if (
  parsedEnv.data.NODE_ENV !== "test" &&
  !parsedEnv.data.KYC_ENCRYPTION_KEY
) {
  console.error("Missing required environment variable: KYC_ENCRYPTION_KEY");
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV !== "test" &&
  !parsedEnv.data.KYC_IDENTITY_HASH_SECRET
) {
  console.error("Missing required environment variable: KYC_IDENTITY_HASH_SECRET");
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
  parsedEnv.data.JWT_ACCESS_SECRET.length < minimumJwtSecretLength
) {
  console.error(
    `JWT_ACCESS_SECRET must be at least ${minimumJwtSecretLength} characters`,
  );
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
  parsedEnv.data.JWT_REFRESH_SECRET.length < minimumJwtSecretLength
) {
  console.error(
    `JWT_REFRESH_SECRET must be at least ${minimumJwtSecretLength} characters`,
  );
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV !== "test" &&
  parsedEnv.data.JWT_ACCESS_SECRET === parsedEnv.data.JWT_REFRESH_SECRET
) {
  console.error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different");
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  parsedEnv.data.CSRF_SECRET.length < minimumJwtSecretLength
) {
  console.error(
    `CSRF_SECRET must be at least ${minimumJwtSecretLength} characters in production`,
  );
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  parsedEnv.data.EMAIL_PROVIDER === "mock"
) {
  console.error("EMAIL_PROVIDER=mock is not allowed in production");
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV !== "test" &&
  parsedEnv.data.EMAIL_PROVIDER === "smtp" &&
  (!parsedEnv.data.EMAIL_FROM || !parsedEnv.data.SMTP_HOST)
) {
  console.error("EMAIL_PROVIDER=smtp requires EMAIL_FROM and SMTP_HOST");
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
  !parsedEnv.data.PG_SSL_CA &&
  !parsedEnv.data.PG_SSL_CA_FILE
) {
  console.error("PG_SSL_CA or PG_SSL_CA_FILE is required in production");
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
  parsedEnv.data.NODE_ENV !== "test" &&
  hasTwilioProvider &&
  (!parsedEnv.data.TWILIO_ACCOUNT_SID || !parsedEnv.data.TWILIO_AUTH_TOKEN)
) {
  console.error(
    "OTP_PROVIDER=twilio requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN",
  );
  process.exit(1);
}

if (
  hasTwilioProvider &&
  parsedEnv.data.TWILIO_ACCOUNT_SID &&
  !/^AC[0-9a-fA-F]{32}$/.test(parsedEnv.data.TWILIO_ACCOUNT_SID)
) {
  console.error("TWILIO_ACCOUNT_SID must be a Twilio Account SID starting with AC");
  process.exit(1);
}

if (
  hasTwilioProvider &&
  hasTwilioVerifyService &&
  !/^VA[0-9a-fA-F]{32}$/.test(parsedEnv.data.TWILIO_VERIFY_SERVICE_SID)
) {
  console.error("TWILIO_VERIFY_SERVICE_SID must be a Twilio Verify Service SID starting with VA");
  process.exit(1);
}

if (
  hasTwilioProvider &&
  hasTwilioDirectSmsSender &&
  !/^\+[1-9]\d{7,14}$/.test(parsedEnv.data.TWILIO_FROM_PHONE)
) {
  console.error("TWILIO_FROM_PHONE must be in E.164 format, for example +14155552671");
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV !== "test" &&
  hasTwilioProvider &&
  !hasTwilioVerifyService &&
  !hasTwilioDirectSmsSender
) {
  console.error(
    "OTP_PROVIDER=twilio requires TWILIO_VERIFY_SERVICE_SID or TWILIO_FROM_PHONE",
  );
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  hasTwilioProvider &&
  !hasTwilioVerifyService
) {
  console.error("TWILIO_VERIFY_SERVICE_SID is required for Twilio OTP in production");
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  hasTwilioProvider &&
  parsedEnv.data.OTP_RATE_LIMIT_HASH_SECRET.length < 32
) {
  console.error(
    "OTP_RATE_LIMIT_HASH_SECRET must be at least 32 characters for Twilio OTP in production",
  );
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV !== "test" &&
  parsedEnv.data.OTP_PROVIDER === "msg91" &&
  (
    !parsedEnv.data.MSG91_AUTH_KEY ||
    !parsedEnv.data.MSG91_TEMPLATE_ID ||
    !parsedEnv.data.MSG91_SENDER_ID
  )
) {
  console.error(
    "OTP_PROVIDER=msg91 requires MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, and MSG91_SENDER_ID",
  );
  process.exit(1);
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  parsedEnv.data.OTP_PROVIDER === "msg91" &&
  (
    !parsedEnv.data.MSG91_AUTH_KEY ||
    !parsedEnv.data.MSG91_TEMPLATE_ID ||
    !parsedEnv.data.MSG91_SENDER_ID
  )
) {
  console.error(
    "OTP_PROVIDER=msg91 requires MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, and MSG91_SENDER_ID in production",
  );
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

if (parsedEnv.data.NODE_ENV === "production" && !parsedEnv.data.REDIS_URL) {
  console.error("REDIS_URL is required in production for BullMQ notifications");
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
  csrfSecret: parsedEnv.data.CSRF_SECRET || parsedEnv.data.JWT_REFRESH_SECRET,
  bcryptSaltRounds: parsedEnv.data.BCRYPT_SALT_ROUNDS,
  passwordResetExpiryMinutes: parsedEnv.data.PASSWORD_RESET_EXPIRY_MINUTES,
  emailVerificationExpiryHours: parsedEnv.data.EMAIL_VERIFICATION_EXPIRY_HOURS,
  authLoginMaxFailedAttempts: parsedEnv.data.AUTH_LOGIN_MAX_FAILED_ATTEMPTS,
  authLoginLockMinutes: parsedEnv.data.AUTH_LOGIN_LOCK_MINUTES,
  emailProvider: parsedEnv.data.EMAIL_PROVIDER,
  emailFrom: parsedEnv.data.EMAIL_FROM,
  smtpHost: parsedEnv.data.SMTP_HOST,
  smtpPort: parsedEnv.data.SMTP_PORT,
  smtpSecure: parsedEnv.data.SMTP_SECURE === "true",
  smtpUser: parsedEnv.data.SMTP_USER,
  smtpPassword: parsedEnv.data.SMTP_PASSWORD,
  googleClientId: parsedEnv.data.GOOGLE_CLIENT_ID,
  googleClientSecret: parsedEnv.data.GOOGLE_CLIENT_SECRET,
  facebookAppId: parsedEnv.data.FACEBOOK_APP_ID,
  facebookAppSecret: parsedEnv.data.FACEBOOK_APP_SECRET,
  otpProvider: parsedEnv.data.OTP_PROVIDER,
  otpExpiryMinutes: parsedEnv.data.OTP_EXPIRY_MINUTES,
  otpResendCooldownSeconds: parsedEnv.data.OTP_RESEND_COOLDOWN_SECONDS,
  otpRateLimitHashSecret: parsedEnv.data.OTP_RATE_LIMIT_HASH_SECRET,
  msg91AuthKey: parsedEnv.data.MSG91_AUTH_KEY,
  msg91TemplateId: parsedEnv.data.MSG91_TEMPLATE_ID,
  msg91SenderId: parsedEnv.data.MSG91_SENDER_ID,
  twilioAccountSid: parsedEnv.data.TWILIO_ACCOUNT_SID,
  twilioAuthToken: parsedEnv.data.TWILIO_AUTH_TOKEN,
  twilioVerifyServiceSid: parsedEnv.data.TWILIO_VERIFY_SERVICE_SID,
  twilioFromPhone: parsedEnv.data.TWILIO_FROM_PHONE,
  kycEncryptionKey: parsedEnv.data.KYC_ENCRYPTION_KEY,
  kycIdentityHashSecret: parsedEnv.data.KYC_IDENTITY_HASH_SECRET,
  privateMediaSigningSecret:
    parsedEnv.data.PRIVATE_MEDIA_SIGNING_SECRET ||
    parsedEnv.data.JWT_ACCESS_SECRET,
  pgSslCa: readPgSslCa(),
  adminJwtAccessSecret: parsedEnv.data.ADMIN_JWT_ACCESS_SECRET,
  adminAccessTokenTtl: parsedEnv.data.ADMIN_ACCESS_TOKEN_TTL,
  adminRefreshTokenTtlDays: parsedEnv.data.ADMIN_REFRESH_TOKEN_TTL_DAYS,
  adminMfaRequired:
    parsedEnv.data.NODE_ENV === "production" ||
    parsedEnv.data.ADMIN_MFA_REQUIRED === "true",
  adminSeedEmail: parsedEnv.data.ADMIN_SEED_EMAIL,
  adminSeedPassword: parsedEnv.data.ADMIN_SEED_PASSWORD,
  adminSeedMfaSecret: parsedEnv.data.ADMIN_SEED_MFA_SECRET,
  adminLoginMaxAttempts: parsedEnv.data.ADMIN_LOGIN_MAX_ATTEMPTS,
  adminLoginLockMinutes: parsedEnv.data.ADMIN_LOGIN_LOCK_MINUTES,
  uploadStorageProvider: parsedEnv.data.UPLOAD_STORAGE_PROVIDER,
  cloudinaryCloudName: parsedEnv.data.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: parsedEnv.data.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: parsedEnv.data.CLOUDINARY_API_SECRET,
  redisUrl: parsedEnv.data.REDIS_URL,
  bullMqWorkerEnabled: parsedEnv.data.BULLMQ_WORKER_ENABLED === "true",
  notificationQueueConcurrency: parsedEnv.data.NOTIFICATION_QUEUE_CONCURRENCY,
  notificationStreamHeartbeatMs:
    parsedEnv.data.NOTIFICATION_STREAM_HEARTBEAT_SECONDS * 1000,
  isProduction: parsedEnv.data.NODE_ENV === "production",
};
