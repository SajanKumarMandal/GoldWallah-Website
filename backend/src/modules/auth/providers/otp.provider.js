import { randomInt } from "node:crypto";

import { env } from "../../../config/env.js";

export function generateOtp() {
  return String(randomInt(100000, 1000000));
}

function otpProviderError(message, code = "OTP_PROVIDER_FAILED", meta = {}) {
  const error = new Error(message);
  error.statusCode = 502;
  error.code = code;
  error.meta = meta;
  return error;
}

function notConfigured(message) {
  return {
    configured: false,
    message,
  };
}

function sent(provider, providerMessageId = null) {
  return {
    configured: true,
    provider,
    providerMessageId,
    message: "OTP sent successfully.",
  };
}

async function safeParseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

function providerMeta(provider, response, body) {
  return {
    provider,
    status: response.status,
    statusText: response.statusText,
    responseCode:
      typeof body === "object" && body !== null
        ? body.type || body.code || body.status || body.message || null
        : null,
  };
}

function assertIndianPhone(phone) {
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw otpProviderError("Unable to send OTP right now", "OTP_INVALID_PHONE");
  }
}

async function sendMsg91Otp({ phone, otp }) {
  assertIndianPhone(phone);
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", env.msg91TemplateId);
  url.searchParams.set("mobile", `91${phone}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authkey: env.msg91AuthKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ otp }),
  });
  const body = await safeParseResponse(response);

  if (!response.ok) {
    throw otpProviderError(
      "Unable to send OTP right now",
      "MSG91_OTP_SEND_FAILED",
      providerMeta("msg91", response, body),
    );
  }

  return sent(
    "msg91",
    typeof body === "object" && body !== null ? body.request_id || null : null,
  );
}

async function sendTwilioSmsOtp({ phone, otp }) {
  assertIndianPhone(phone);
  const credentials = Buffer.from(
    `${env.twilioAccountSid}:${env.twilioAuthToken}`,
  ).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: `+91${phone}`,
        From: env.twilioFromPhone,
        Body: `Your GoldWallah verification code is ${otp}. It expires in ${env.otpExpiryMinutes} minutes.`,
      }),
    },
  );
  const body = await safeParseResponse(response);

  if (!response.ok) {
    throw otpProviderError(
      "Unable to send OTP right now",
      "TWILIO_OTP_SEND_FAILED",
      providerMeta("twilio", response, body),
    );
  }

  return sent(
    "twilio",
    typeof body === "object" && body !== null ? body.sid || null : null,
  );
}

export async function sendOtp({ phone, otp }) {
  if (env.otpProvider === "mock") {
    return {
      configured: true,
      provider: "mock",
      providerMessageId: null,
      message: env.isProduction
        ? "OTP generated for configured provider."
        : "Mock OTP generated. Use 123456 in development if SMS is not configured.",
    };
  }

  if (env.otpProvider === "msg91") {
    if (!env.msg91AuthKey || !env.msg91TemplateId) {
      return notConfigured(
        "MSG91 OTP is not configured. Add MSG91_AUTH_KEY and MSG91_TEMPLATE_ID in backend .env",
      );
    }

    return sendMsg91Otp({ phone, otp });
  }

  if (env.otpProvider === "twilio") {
    if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioFromPhone) {
      return notConfigured(
        "Twilio OTP is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE in backend .env",
      );
    }

    return sendTwilioSmsOtp({ phone, otp });
  }

  return notConfigured(
    "OTP provider is not supported. Use OTP_PROVIDER=msg91 or OTP_PROVIDER=twilio",
  );
}
