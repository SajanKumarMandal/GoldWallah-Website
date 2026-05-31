import { OAuth2Client } from "google-auth-library";

import { env } from "../../../config/env.js";

let googleClient;

function providerError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export async function verifyGoogleIdToken(idToken) {
  if (!env.googleClientId) {
    throw providerError("Google login is not configured", 503, "GOOGLE_NOT_CONFIGURED");
  }

  if (!googleClient) {
    googleClient = new OAuth2Client(env.googleClientId);
  }

  let ticket;

  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });
  } catch {
    throw providerError("Invalid Google token", 401, "INVALID_GOOGLE_TOKEN");
  }

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw providerError("Google account profile is incomplete", 401, "INVALID_GOOGLE_PROFILE");
  }

  if (payload.email_verified !== true) {
    throw providerError("Google email is not verified", 401, "GOOGLE_EMAIL_NOT_VERIFIED");
  }

  return {
    provider: "GOOGLE",
    providerSubject: payload.sub,
    email: payload.email.toLowerCase(),
    fullName: payload.name || payload.email.split("@")[0],
    isEmailVerified: true,
  };
}
