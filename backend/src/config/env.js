import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  API_VERSION: z.string().min(1).default("v1"),
  DATABASE_URL: z.string().optional().default(""),
  JWT_ACCESS_SECRET: z.string().optional().default(""),
  JWT_REFRESH_SECRET: z.string().optional().default(""),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default("7d"),
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
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid backend environment configuration");
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  frontendOrigin: parsedEnv.data.FRONTEND_ORIGIN || parsedEnv.data.FRONTEND_URL,
  frontendUrl: parsedEnv.data.FRONTEND_URL,
  apiVersion: parsedEnv.data.API_VERSION,
  databaseUrl: parsedEnv.data.DATABASE_URL,
  jwtAccessSecret: parsedEnv.data.JWT_ACCESS_SECRET,
  jwtRefreshSecret: parsedEnv.data.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: parsedEnv.data.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: parsedEnv.data.JWT_REFRESH_EXPIRES_IN,
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
  isProduction: parsedEnv.data.NODE_ENV === "production",
};
