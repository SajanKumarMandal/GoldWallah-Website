export async function verifyGoogleIdToken(_idToken) {
  const error = new Error("Google OAuth is disabled for this production build.");
  error.statusCode = 501;
  error.code = "GOOGLE_OAUTH_DISABLED";
  throw error;
}
