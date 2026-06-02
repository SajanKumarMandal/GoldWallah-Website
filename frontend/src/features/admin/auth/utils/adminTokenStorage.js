const LEGACY_ADMIN_SESSION_KEY = "goldwallah.admin.session";

let adminSession = {
  admin: null,
  accessToken: "",
};

function clearLegacyPersistentSession() {
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
  if (!adminSession.accessToken) {
    return null;
  }

  return {
    admin: adminSession.admin,
    accessToken: adminSession.accessToken,
  };
}

export function writeAdminSession({ admin, accessToken }) {
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
  adminSession = {
    admin: null,
    accessToken: "",
  };
}

export function getAdminAccessToken() {
  return readAdminSession()?.accessToken || "";
}

export function getAdminRefreshToken() {
  return "";
}
