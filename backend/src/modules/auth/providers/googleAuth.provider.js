import { env } from "../../../config/env.js";

export async function verifyGoogleIdToken(_idToken) {
  if (!env.googleClientId) {
    const error = new Error(
      "Google OAuth is not configured. Add GOOGLE_CLIENT_ID in backend .env",
    );
    error.statusCode = 501;
    error.code = "GOOGLE_OAUTH_NOT_CONFIGURED";
    throw error;
  }

  const error = new Error("Google OAuth token verification is not implemented yet.");
  error.statusCode = 501;
  error.code = "GOOGLE_OAUTH_PENDING";
  // TODO: Verify Google ID token against GOOGLE_CLIENT_ID and map profile claims.
  throw error;
}
