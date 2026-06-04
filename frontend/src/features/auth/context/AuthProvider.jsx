import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AuthContext } from "@/features/auth/context/authContextValue";
import { refreshUserSession } from "@/features/auth/services/authService";

// Browser-side user session state. Access tokens stay in memory only; the
// backend-owned HttpOnly refresh cookie restores the session after a reload.
const AUTH_STORAGE_KEY = "goldwallah.auth.session";
let bootSessionRefreshPromise = null;

// Central shape for auth state. Access tokens are intentionally memory-only,
// and isSessionLoading blocks route decisions until refresh completes.
const initialAuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isSessionLoading: true,
};

function clearLegacyStoredAuthState() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures; HttpOnly cookie refresh owns sessions.
  }
}

function readStoredAuthState() {
  // Previous builds used localStorage; remove it every boot so stale sensitive
  // auth state cannot survive the HttpOnly-cookie migration.
  clearLegacyStoredAuthState();

  return {
    ...initialAuthState,
    isSessionLoading: true,
  };
}

function persistAuthState() {
  // Kept as a compatibility shim for callers that used to persist auth state.
  // It now only clears legacy storage.
  clearLegacyStoredAuthState();
}

function refreshBootSession() {
  // Deduplicate simultaneous boot/refresh calls from multiple mounted trees.
  if (!bootSessionRefreshPromise) {
    bootSessionRefreshPromise = refreshUserSession().finally(() => {
      bootSessionRefreshPromise = null;
    });
  }

  return bootSessionRefreshPromise;
}

function getJwtExpiryMs(accessToken) {
  try {
    // Decode only the expiry claim for client-side refresh timing; server APIs
    // still perform all real JWT verification.
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
  // Guards async refresh callbacks from overwriting a newer login/logout state.
  const sessionVersionRef = useRef(0);

  const clearAuthUser = useCallback(() => {
    // Local logout/session expiry clears memory state and any legacy storage.
    sessionVersionRef.current += 1;
    clearLegacyStoredAuthState();
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
        // Restore a browser session by asking the backend to rotate the
        // HttpOnly refresh cookie and return a fresh short-lived access token.
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
    // Refresh one minute before expiry when possible, with a minimum delay to
    // avoid tight loops for malformed or already-expired tokens.
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
    // Update profile/status fields after protected API calls while preserving
    // the current in-memory access token.
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
    // Store a newly authenticated browser session after login/register/OTP/OAuth.
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
    // Memoize the context value so consumers re-render only when auth data or
    // auth mutators actually change.
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
