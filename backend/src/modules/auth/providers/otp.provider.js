import { env } from "../../../config/env.js";

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
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

    void phone;
    void otp;
    return {
      configured: true,
      message: "MSG91 OTP provider is configured. Provider API integration is pending.",
    };
  }

  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioVerifyServiceSid) {
    return {
      configured: false,
      message:
        "Twilio OTP is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID in backend .env",
    };
  }

  void phone;
  void otp;
  return {
    configured: true,
    message: "Twilio OTP provider is configured. Provider API integration is pending.",
  };
}
