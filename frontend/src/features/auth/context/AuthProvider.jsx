import { useCallback, useMemo, useState } from "react";

import { AuthContext } from "@/features/auth/context/authContextValue";

const AUTH_STORAGE_KEY = "goldwallah.auth.session";

const initialAuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
};

function readStoredAuthState() {
  try {
    const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!storedSession) {
      return initialAuthState;
    }

    const parsedSession = JSON.parse(storedSession);

    if (!parsedSession?.user || !parsedSession?.accessToken) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return initialAuthState;
    }

    return {
      user: parsedSession.user,
      accessToken: parsedSession.accessToken,
      refreshToken: parsedSession.refreshToken || null,
      isAuthenticated: true,
    };
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return initialAuthState;
  }
}

function persistAuthState({ user, accessToken, refreshToken }) {
  if (!user || !accessToken) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ user, accessToken, refreshToken: refreshToken || null }),
  );
}

export default function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(readStoredAuthState);
  const setAuthUser = useCallback((user) => {
    setAuthState((currentState) => {
      const nextState = {
        user,
        accessToken: currentState.accessToken,
        refreshToken: currentState.refreshToken,
        isAuthenticated: Boolean(user && currentState.accessToken),
      };

      persistAuthState(nextState);
      return nextState;
    });
  }, []);

  const setAuthSession = useCallback(({ user, accessToken, refreshToken }) => {
    persistAuthState({ user, accessToken, refreshToken });
    if (import.meta.env.DEV) {
      console.debug("Auth session stored", {
        hasUser: Boolean(user),
        hasAccessToken: Boolean(accessToken),
        hasRefreshToken: Boolean(refreshToken),
      });
    }
    setAuthState({
      user,
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
      isAuthenticated: Boolean(user && accessToken),
    });
  }, []);

  const clearAuthUser = useCallback(() => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthState(initialAuthState);
  }, []);

  const value = useMemo(
    () => ({
      user: authState.user,
      accessToken: authState.accessToken,
      refreshToken: authState.refreshToken,
      isAuthenticated: authState.isAuthenticated,
      setAuthUser,
      setAuthSession,
      clearAuthUser,
    }),
    [authState, clearAuthUser, setAuthSession, setAuthUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
