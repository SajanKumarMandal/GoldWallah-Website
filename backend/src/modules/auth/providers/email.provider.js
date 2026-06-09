import nodemailer from "nodemailer";

import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";

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

  if (!env.smtpHost || !env.emailFrom) {
    throw createEmailError("Email delivery is not configured", "EMAIL_NOT_CONFIGURED");
  }
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
    await getSmtpTransporter().sendMail({
      from: env.emailFrom,
      to,
      subject,
      text,
    });

    logger.info({ provider: "smtp", to, subject }, "Auth email sent");
    return {
      configured: true,
      provider: "smtp",
    };
  } catch (error) {
    logger.warn({ error, provider: "smtp", to, subject }, "Auth email failed");
    throw createEmailError("Email delivery failed");
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

