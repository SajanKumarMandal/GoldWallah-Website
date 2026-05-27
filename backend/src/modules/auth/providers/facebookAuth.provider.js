import { env } from "../../../config/env.js";

export async function verifyFacebookAccessToken(_accessToken) {
  if (!env.facebookAppId || !env.facebookAppSecret) {
    const error = new Error(
      "Facebook OAuth is not configured. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in backend .env",
    );
    error.statusCode = 501;
    error.code = "FACEBOOK_OAUTH_NOT_CONFIGURED";
    throw error;
  }

  const error = new Error("Facebook OAuth token verification is not implemented yet.");
  error.statusCode = 501;
  error.code = "FACEBOOK_OAUTH_PENDING";
  // TODO: Verify Facebook access token and map profile fields.
  throw error;
}
