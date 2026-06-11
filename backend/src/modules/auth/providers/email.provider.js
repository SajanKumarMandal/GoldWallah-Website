import nodemailer from "nodemailer";

import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";

const resendEmailEndpoint = "https://api.resend.com/emails";

let smtpTransporter;

function createEmailError(message, code = "EMAIL_PROVIDER_FAILED") {
  const error = new Error(message);
  error.statusCode = 502;
  error.code = code;
  return error;
}

function getSmtpTransporter() {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth:
        env.smtpUser && env.smtpPassword
          ? {
              user: env.smtpUser,
              pass: env.smtpPassword,
            }
          : undefined,
    });
  }

  return smtpTransporter;
}

function assertEmailConfigured() {
  if (env.emailProvider === "mock") {
    if (env.isProduction) {
      throw createEmailError("Email delivery is not configured", "EMAIL_NOT_CONFIGURED");
    }

    return;
  }

  if (!env.emailFrom) {
    throw createEmailError("Email sender is not configured", "EMAIL_NOT_CONFIGURED");
  }

  if (env.emailProvider === "smtp" && !env.smtpHost) {
    throw createEmailError("SMTP email delivery is not configured", "EMAIL_NOT_CONFIGURED");
  }

  if (env.emailProvider === "resend" && !env.resendApiKey) {
    throw createEmailError("Resend email delivery is not configured", "EMAIL_NOT_CONFIGURED");
  }
}

async function sendMailWithResend({ to, subject, text }) {
  const response = await fetch(resendEmailEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to,
      subject,
      text,
    }),
  });

  let responseBody = null;

  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    logger.warn(
      {
        provider: "resend",
        to,
        subject,
        statusCode: response.status,
        responseBody,
      },
      "Auth email failed",
    );
    throw createEmailError("Email delivery failed");
  }

  logger.info(
    {
      provider: "resend",
      to,
      subject,
      messageId: responseBody?.id,
    },
    "Auth email sent",
  );

  return {
    configured: true,
    provider: "resend",
    messageId: responseBody?.id,
  };
}

async function sendMailWithSmtp({ to, subject, text }) {
  const info = await getSmtpTransporter().sendMail({
    from: env.emailFrom,
    to,
    subject,
    text,
  });

  logger.info(
    { provider: "smtp", to, subject, messageId: info?.messageId },
    "Auth email sent",
  );

  return {
    configured: true,
    provider: "smtp",
    messageId: info?.messageId,
  };
}

async function sendMail({ to, subject, text }) {
  assertEmailConfigured();

  if (env.emailProvider === "mock") {
    logger.info(
      {
        provider: "mock",
        to,
        subject,
      },
      "Auth email queued by mock provider",
    );
    return {
      configured: true,
      provider: "mock",
    };
  }

  try {
    if (env.emailProvider === "resend") {
      return await sendMailWithResend({ to, subject, text });
    }

    return await sendMailWithSmtp({ to, subject, text });
  } catch (error) {
    logger.warn(
      {
        error: {
          name: error?.name,
          message: error?.message,
          code: error?.code,
          command: error?.command,
        },
        provider: env.emailProvider,
        to,
        subject,
      },
      "Auth email failed",
    );
    throw createEmailError("Email delivery failed", error?.code || "EMAIL_PROVIDER_FAILED");
  }
}

export async function sendPasswordResetEmail({ to, resetUrl, expiresInMinutes }) {
  return sendMail({
    to,
    subject: "Reset your GoldWallah password",
    text: [
      "A password reset was requested for your GoldWallah account.",
      `Reset your password here: ${resetUrl}`,
      `This link expires in ${expiresInMinutes} minutes.`,
      "If you did not request this, ignore this email.",
    ].join("\n\n"),
  });
}

export async function sendEmailVerificationEmail({
  to,
  verificationUrl,
  expiresInHours,
}) {
  return sendMail({
    to,
    subject: "Verify your GoldWallah email",
    text: [
      "Verify your email address for your GoldWallah account.",
      `Verify your email here: ${verificationUrl}`,
      `This link expires in ${expiresInHours} hours.`,
      "If you did not request this, ignore this email.",
    ].join("\n\n"),
  });
}
