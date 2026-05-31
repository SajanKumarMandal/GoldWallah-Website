import { randomInt } from "node:crypto";

import { env } from "../../../config/env.js";

export function generateOtp() {
  return String(randomInt(100000, 1000000));
}

function otpProviderError(message, code = "OTP_PROVIDER_FAILED") {
  const error = new Error(message);
  error.statusCode = 502;
  error.code = code;
  return error;
}

async function sendMsg91Otp({ phone, otp }) {
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

  if (!response.ok) {
    throw otpProviderError("Unable to send OTP right now");
  }
}

async function sendTwilioSmsOtp({ phone, otp }) {
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

  if (!response.ok) {
    throw otpProviderError("Unable to send OTP right now");
  }
}

export async function sendOtp({ phone, otp }) {
  if (env.otpProvider === "mock") {
    return {
      configured: true,
      message: env.isProduction
        ? "OTP generated for configured provider."
        : "Mock OTP generated. Use 123456 in development if SMS is not configured.",
    };
  }

  if (env.otpProvider === "msg91") {
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

  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioFromPhone) {
    return {
      configured: false,
      message:
        "Twilio OTP is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE in backend .env",
    };
  }

  await sendTwilioSmsOtp({ phone, otp });
  return {
    configured: true,
    message: "OTP sent successfully.",
  };
}
