import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AuthContext } from "@/features/auth/context/authContextValue";
import { refreshUserSession } from "@/features/auth/services/authService";

// Browser-side user session state. Access tokens stay in memory only; the
// backend-owned HttpOnly refresh cookie restores the session after a reload.
const AUTH_STORAGE_KEY = "goldwallah.auth.session";
let bootSessionRefreshPromise = null;

const initialAuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isSessionLoading: true,
};

function readStoredAuthState() {
  try {
    const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!storedSession) {
      return {
        ...initialAuthState,
        isSessionLoading: true,
      };
    }

    const parsedSession = JSON.parse(storedSession);

    if (!parsedSession?.user) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return {
        ...initialAuthState,
        isSessionLoading: true,
      };
    }

    return {
      user: parsedSession.user,
      accessToken: null,
      isAuthenticated: false,
      isSessionLoading: true,
    };
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return {
      ...initialAuthState,
      isSessionLoading: true,
    };
  }
}

function persistAuthState({ user }) {
  if (!user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user }));
}

function refreshBootSession() {
  if (!bootSessionRefreshPromise) {
    bootSessionRefreshPromise = refreshUserSession().finally(() => {
      bootSessionRefreshPromise = null;
    });
  }

  return bootSessionRefreshPromise;
}

function getJwtExpiryMs(accessToken) {
  try {
    const [, payload] = accessToken.split(".");
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(normalizedPayload));

    return decoded?.exp ? decoded.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export default function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(readStoredAuthState);
  const sessionVersionRef = useRef(0);

  const clearAuthUser = useCallback(() => {
    sessionVersionRef.current += 1;
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthState({
      ...initialAuthState,
      isSessionLoading: false,
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const restoreVersion = sessionVersionRef.current;

    async function restoreSession() {
      try {
        const result = await refreshBootSession();
        const user = result?.data?.user || null;
        const accessToken = result?.data?.accessToken || null;

        if (!isMounted || sessionVersionRef.current !== restoreVersion) {
          return;
        }

        if (!user || !accessToken) {
          persistAuthState({ user: null });
          setAuthState({
            ...initialAuthState,
            isSessionLoading: false,
          });
          return;
        }

        persistAuthState({ user });
        setAuthState({
          user,
          accessToken,
          isAuthenticated: true,
          isSessionLoading: false,
        });
      } catch {
        if (!isMounted || sessionVersionRef.current !== restoreVersion) {
          return;
        }

        persistAuthState({ user: null });
        setAuthState({
          ...initialAuthState,
          isSessionLoading: false,
        });
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!authState.accessToken) {
      return undefined;
    }

    const expiresAtMs = getJwtExpiryMs(authState.accessToken);
    const refreshInMs = Math.max(expiresAtMs - Date.now() - 60_000, 30_000);
    const timerId = window.setTimeout(async () => {
      const refreshVersion = sessionVersionRef.current;

      try {
        const result = await refreshBootSession();
        const user = result?.data?.user || null;
        const accessToken = result?.data?.accessToken || null;

        if (!user || !accessToken || sessionVersionRef.current !== refreshVersion) {
          return;
        }

        persistAuthState({ user });
        setAuthState({
          user,
          accessToken,
          isAuthenticated: true,
          isSessionLoading: false,
        });
      } catch {
        if (sessionVersionRef.current === refreshVersion) {
          clearAuthUser();
        }
      }
    }, refreshInMs);

    return () => window.clearTimeout(timerId);
  }, [authState.accessToken, clearAuthUser]);

  const setAuthUser = useCallback((user) => {
    sessionVersionRef.current += 1;
    setAuthState((currentState) => {
      const nextState = {
        user,
        accessToken: currentState.accessToken,
        isAuthenticated: Boolean(user && currentState.accessToken),
        isSessionLoading: false,
      };

      persistAuthState(nextState);
      return nextState;
    });
  }, []);

  const setAuthSession = useCallback(({ user, accessToken }) => {
    sessionVersionRef.current += 1;
    persistAuthState({ user });
    if (import.meta.env.DEV) {
      console.debug("Auth session stored", {
        hasUser: Boolean(user),
        hasAccessToken: Boolean(accessToken),
      });
    }
    setAuthState({
      user,
      accessToken: accessToken || null,
      isAuthenticated: Boolean(user && accessToken),
      isSessionLoading: false,
    });
  }, []);

  const value = useMemo(
    () => ({
      user: authState.user,
      accessToken: authState.accessToken,
      isAuthenticated: authState.isAuthenticated,
      isSessionLoading: authState.isSessionLoading,
      setAuthUser,
      setAuthSession,
      clearAuthUser,
    }),
    [authState, clearAuthUser, setAuthSession, setAuthUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
