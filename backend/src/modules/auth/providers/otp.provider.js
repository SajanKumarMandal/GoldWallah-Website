import { createHmac, randomInt } from "node:crypto";

import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";

const TWILIO_VERIFY_BASE_URL = "https://verify.twilio.com/v2/Services";

export function generateOtp() {
  // Generate a six-digit numeric OTP using Node crypto instead of Math.random.
  return String(randomInt(100000, 1000000));
}

function otpProviderError(message, code = "OTP_PROVIDER_FAILED") {
  // Hide provider-specific response details from clients while preserving a
  // machine-readable code for logs/handlers.
  const error = new Error(message);
  error.statusCode = 502;
  error.code = code;
  return error;
}

function toIndianE164Phone(phone) {
  return `+91${phone}`;
}

function twilioAuthorizationHeader() {
  return `Basic ${Buffer.from(
    `${env.twilioAccountSid}:${env.twilioAuthToken}`,
  ).toString("base64")}`;
}

function twilioVerifyUrl(resource) {
  return `${TWILIO_VERIFY_BASE_URL}/${encodeURIComponent(
    env.twilioVerifyServiceSid,
  )}/${resource}`;
}

function twilioCredentialsConfigured() {
  return Boolean(env.twilioAccountSid && env.twilioAuthToken);
}

function hashRateLimitValue(value) {
  const normalizedValue = typeof value === "string" ? value.trim() : "";

  if (!env.otpRateLimitHashSecret || !normalizedValue) {
    return "";
  }

  return createHmac("sha256", env.otpRateLimitHashSecret)
    .update(normalizedValue)
    .digest("hex");
}

function appendTwilioRateLimits(body, { phone, ip } = {}) {
  const phoneHash = hashRateLimitValue(phone);
  const ipHash = hashRateLimitValue(ip);

  if (phoneHash) {
    body.set("RateLimits[phone_hash]", phoneHash);
  }

  if (ipHash) {
    body.set("RateLimits[ip_hash]", ipHash);
  }
}

async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function logOtpProviderEvent(level, provider, message, metadata = {}) {
  logger[level](
    {
      provider,
      ...metadata,
    },
    message,
  );
}

async function sendMsg91Otp({ phone, otp }) {
  // MSG91 handles templated OTP delivery for Indian phone numbers.
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", env.msg91TemplateId);
  url.searchParams.set("mobile", `91${phone}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authkey: env.msg91AuthKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      otp,
      sender: env.msg91SenderId,
    }),
  });

  const payload = await readJsonSafely(response);

  if (!response.ok || payload.type === "error") {
    logOtpProviderEvent("warn", "msg91", "MSG91 OTP send failed", {
      status: response.status,
      providerCode: payload.type || payload.code,
    });
    throw otpProviderError("Unable to send OTP right now");
  }

  logOtpProviderEvent("info", "msg91", "MSG91 OTP send accepted");
}

async function sendTwilioSmsOtp({ phone, otp }) {
  // Twilio fallback sends a direct SMS with the generated OTP and expiry copy.
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: twilioAuthorizationHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: toIndianE164Phone(phone),
        From: env.twilioFromPhone,
        Body: `Your GoldWallah verification code is ${otp}. It expires in ${env.otpExpiryMinutes} minutes.`,
      }),
    },
  );

  if (!response.ok) {
    logOtpProviderEvent("warn", "twilio-sms", "Twilio SMS OTP send failed", {
      status: response.status,
    });
    throw otpProviderError("Unable to send OTP right now");
  }

  logOtpProviderEvent("info", "twilio-sms", "Twilio SMS OTP send accepted");
}

async function sendTwilioVerifyOtp({ phone, rateLimitContext }) {
  // Twilio Verify owns code generation and carrier-compliant delivery.
  const body = new URLSearchParams({
    To: toIndianE164Phone(phone),
    Channel: "sms",
    RiskCheck: "enable",
  });
  appendTwilioRateLimits(body, rateLimitContext);

  const response = await fetch(twilioVerifyUrl("Verifications"), {
    method: "POST",
    headers: {
      Authorization: twilioAuthorizationHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    logOtpProviderEvent("warn", "twilio-verify", "Twilio Verify send failed", {
      status: response.status,
    });
    throw otpProviderError("Unable to send OTP right now");
  }

  logOtpProviderEvent("info", "twilio-verify", "Twilio Verify send accepted");
}

async function verifyTwilioOtp({ phone, otp }) {
  const response = await fetch(twilioVerifyUrl("VerificationCheck"), {
    method: "POST",
    headers: {
      Authorization: twilioAuthorizationHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: toIndianE164Phone(phone),
      Code: otp,
    }),
  });

  if ([400, 404].includes(response.status)) {
    // Twilio uses these for wrong, expired, already-approved, or exhausted
    // verification checks. Return a generic OTP failure to the auth service.
    logOtpProviderEvent("warn", "twilio-verify", "Twilio Verify check rejected", {
      status: response.status,
    });
    return false;
  }

  if (!response.ok) {
    logOtpProviderEvent("warn", "twilio-verify", "Twilio Verify check failed", {
      status: response.status,
    });
    throw otpProviderError("Unable to verify OTP right now");
  }

  const payload = await readJsonSafely(response);
  const approved = payload.status === "approved" || payload.valid === true;

  logOtpProviderEvent("info", "twilio-verify", "Twilio Verify check completed", {
    approved,
  });
  return approved;
}

export function usesProviderManagedOtpVerification() {
  return env.otpProvider === "twilio" && Boolean(env.twilioVerifyServiceSid);
}

export async function verifyOtpWithProvider({ phone, otp }) {
  if (!usesProviderManagedOtpVerification()) {
    return false;
  }

  if (!twilioCredentialsConfigured()) {
    throw otpProviderError("Unable to verify OTP right now");
  }

  return verifyTwilioOtp({ phone, otp });
}

export async function sendOtp({ phone, otp, rateLimitContext }) {
  // Select the configured provider at runtime. Production blocks mock OTP in env
  // validation, so mock mode remains local/test only.
  if (env.otpProvider === "mock") {
    logOtpProviderEvent("info", "mock", "Mock OTP generated");
    return {
      configured: true,
      message: env.isProduction
        ? "OTP generated for configured provider."
        : "Mock OTP generated. Use 123456 in development if SMS is not configured.",
    };
  }

  if (env.otpProvider === "msg91") {
    // Fail as not configured instead of silently dropping OTPs.
    if (!env.msg91AuthKey || !env.msg91TemplateId || !env.msg91SenderId) {
      return {
        configured: false,
        message:
          "MSG91 OTP is not configured. Add MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, and MSG91_SENDER_ID in backend .env",
      };
    }

    await sendMsg91Otp({ phone, otp });
    return {
      configured: true,
      message: "OTP sent successfully.",
    };
  }

  if (!twilioCredentialsConfigured()) {
    return {
      configured: false,
      message:
        "Twilio OTP is not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in backend .env",
    };
  }

  if (env.twilioVerifyServiceSid) {
    await sendTwilioVerifyOtp({ phone, rateLimitContext });
    return {
      configured: true,
      message: "OTP sent successfully.",
    };
  }

  if (!env.twilioFromPhone || !otp) {
    return {
      configured: false,
      message:
        "Twilio SMS OTP is not configured. Add TWILIO_VERIFY_SERVICE_SID or TWILIO_FROM_PHONE in backend .env",
    };
  }

  await sendTwilioSmsOtp({ phone, otp });
  return {
    configured: true,
    message: "OTP sent successfully.",
  };
}
