import { OAuth2Client } from "google-auth-library";

import { env } from "../../../config/env.js";

let googleClient;

function providerError(message, statusCode, code) {
  // Normalize Google verification failures into safe API errors.
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export async function verifyGoogleIdToken(idToken) {
  // Validate the Google ID token server-side; the frontend token alone is never
  // enough to create a GoldWallah session.
  if (!env.googleClientId) {
    throw providerError("Google login is not configured", 503, "GOOGLE_NOT_CONFIGURED");
  }

  if (!googleClient) {
    // Reuse the OAuth client across requests to avoid repeated setup work.
    googleClient = new OAuth2Client(env.googleClientId);
  }

  let ticket;

  try {
    // Audience binding ensures the token was issued for this GoldWallah client id.
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });
  } catch {
    throw providerError("Invalid Google token", 401, "INVALID_GOOGLE_TOKEN");
  }

  // Require stable subject and verified email before account lookup/linking.
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw providerError("Google account profile is incomplete", 401, "INVALID_GOOGLE_PROFILE");
  }

  if (payload.email_verified !== true) {
    throw providerError("Google email is not verified", 401, "GOOGLE_EMAIL_NOT_VERIFIED");
  }

  // Return the shared provider profile shape used by auth.service.js.
  return {
    provider: "GOOGLE",
    providerSubject: payload.sub,
    email: payload.email.toLowerCase(),
    fullName: payload.name || payload.email.split("@")[0],
    isEmailVerified: true,
  };
}
