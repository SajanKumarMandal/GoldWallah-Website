export async function verifyFacebookAccessToken(_accessToken) {
  const error = new Error("Facebook OAuth is disabled for this production build.");
  error.statusCode = 501;
  error.code = "FACEBOOK_OAUTH_DISABLED";
  throw error;
}
