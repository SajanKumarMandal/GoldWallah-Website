const ADMIN_SESSION_KEY = "goldwallah.admin.session";

export function readAdminSession() {
  try {
    const storedSession = window.localStorage.getItem(ADMIN_SESSION_KEY);

    if (!storedSession) {
      return null;
    }

    const parsedSession = JSON.parse(storedSession);

    if (!parsedSession?.accessToken) {
      clearAdminSession();
      return null;
    }

    return {
      admin: parsedSession.admin || null,
      accessToken: parsedSession.accessToken,
      refreshToken: parsedSession.refreshToken || null,
    };
  } catch {
    clearAdminSession();
    return null;
  }
}

export function writeAdminSession({ admin, accessToken, refreshToken }) {
  if (!accessToken) {
    clearAdminSession();
    return;
  }

  window.localStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({
      admin: admin || null,
      accessToken,
      refreshToken: refreshToken || null,
    }),
  );
}

export function clearAdminSession() {
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function getAdminAccessToken() {
  return readAdminSession()?.accessToken || "";
}

export function getAdminRefreshToken() {
  return readAdminSession()?.refreshToken || "";
}
