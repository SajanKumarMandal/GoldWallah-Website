const requiredEnv = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
};

export const env = {
  apiBaseUrl: requiredEnv.apiBaseUrl || "http://localhost:5000/api/v1",
  appName: import.meta.env.VITE_APP_NAME || "GoldWallah",
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  facebookAppId: import.meta.env.VITE_FACEBOOK_APP_ID || "",
};

export function validateRequiredEnv() {
  if (import.meta.env.PROD && !requiredEnv.apiBaseUrl) {
    throw new Error("Missing required environment variable: VITE_API_BASE_URL");
  }
}
