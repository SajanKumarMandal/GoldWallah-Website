const LEGACY_ADMIN_SESSION_KEY = "goldwallah.admin.session";

// Admin access tokens live only in module memory. Refresh tokens are held by the
// backend in HttpOnly cookies and are never exposed to JavaScript.
let adminSession = {
  admin: null,
  accessToken: "",
};

function clearLegacyPersistentSession() {
  // Remove old localStorage-based admin sessions from earlier builds.
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(LEGACY_ADMIN_SESSION_KEY);
  } catch {
    // Ignore storage access failures; admin tokens are no longer read from storage.
  }
}

clearLegacyPersistentSession();

export function readAdminSession() {
  // Return null instead of an empty object so guards can fail closed.
  if (!adminSession.accessToken) {
    return null;
  }

  return {
    admin: adminSession.admin,
    accessToken: adminSession.accessToken,
  };
}

export function writeAdminSession({ admin, accessToken }) {
  // Writing without an access token clears the in-memory session.
  if (!accessToken) {
    clearAdminSession();
    return;
  }

  adminSession = {
    admin: admin || null,
    accessToken,
  };
}

export function clearAdminSession() {
  // Clear all admin identity and token data from memory.
  adminSession = {
    admin: null,
    accessToken: "",
  };
}

export function getAdminAccessToken() {
  // Convenience accessor for admin services and route guards.
  return readAdminSession()?.accessToken || "";
}

export function getAdminRefreshToken() {
  // Compatibility shim: refresh token is intentionally unavailable to frontend JS.
  return "";
}
