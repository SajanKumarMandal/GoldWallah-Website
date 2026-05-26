const requiredEnv = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
};

export const env = {
  apiBaseUrl: requiredEnv.apiBaseUrl || "/api",
  appName: import.meta.env.VITE_APP_NAME || "GoldWallah",
};

export function validateRequiredEnv() {
  if (import.meta.env.PROD && !requiredEnv.apiBaseUrl) {
    throw new Error("Missing required environment variable: VITE_API_BASE_URL");
  }
}
