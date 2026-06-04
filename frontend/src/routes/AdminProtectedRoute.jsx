import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import {
  getAdminMe,
  refreshAdminSession,
} from "@/features/admin/auth/services/adminAuthService";
import {
  clearAdminSession,
  readAdminSession,
  writeAdminSession,
} from "@/features/admin/auth/utils/adminTokenStorage";

const initialState = {
  isLoading: true,
  accessToken: "",
  admin: null,
  error: "",
};

function getJwtExpiryMs(accessToken) {
  // Decode expiry only for scheduling refresh. Backend still performs real JWT
  // verification for every admin API request.
  try {
    const [, payload] = accessToken.split(".");
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(normalizedPayload));

    return decoded?.exp ? decoded.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function applyAdminSession(result, fallbackAccessToken = "") {
  // Normalize admin refresh/me responses into route state and memory storage.
  const admin = result?.data?.admin || null;
  const accessToken = result?.data?.accessToken || fallbackAccessToken;

  if (!admin || !accessToken) {
    return null;
  }

  writeAdminSession({ admin, accessToken });

  return {
    isLoading: false,
    accessToken,
    admin,
    error: "",
  };
}

// Admin route guard verifies the in-memory admin access token or restores a
// session through the admin HttpOnly refresh cookie before rendering children.
export default function AdminProtectedRoute() {
  const location = useLocation();
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      // First try the current in-memory access token against /admin/auth/me.
      const session = readAdminSession();

      if (session?.accessToken) {
        try {
          const nextState = applyAdminSession(
            await getAdminMe(session.accessToken),
            session.accessToken,
          );

          if (nextState && isMounted) {
            setState(nextState);
            return;
          }
        } catch (error) {
          if (error.status !== 401) {
            // Non-auth failures should not silently redirect as if credentials
            // were wrong; keep an authError available to child layouts.
            clearAdminSession();
            if (isMounted) {
              setState({
                ...initialState,
                isLoading: false,
                error: "Unable to verify admin session.",
              });
            }
            return;
          }
        }
      }

      try {
        // If no valid in-memory token exists, rotate the admin refresh cookie.
        const nextState = applyAdminSession(await refreshAdminSession());

        if (!nextState) {
          throw new Error("Admin session refresh failed");
        }

        if (isMounted) {
          setState(nextState);
        }
      } catch (error) {
        clearAdminSession();
        if (isMounted) {
          setState({
            ...initialState,
            isLoading: false,
            error: error.status === 401 ? "" : "Unable to verify admin session.",
          });
        }
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!state.accessToken) {
      return undefined;
    }

    const expiresAtMs = getJwtExpiryMs(state.accessToken);

    if (!expiresAtMs) {
      return undefined;
    }

    // Refresh one minute before expiry, with a lower bound to avoid tight loops.
    const refreshInMs = Math.max(expiresAtMs - Date.now() - 60_000, 30_000);
    let isActive = true;
    const timerId = window.setTimeout(async () => {
      try {
        const nextState = applyAdminSession(await refreshAdminSession());

        if (!nextState) {
          throw new Error("Admin session refresh failed");
        }

        if (isActive) {
          setState(nextState);
        }
      } catch {
        if (isActive) {
          clearAdminSession();
          setState({
            ...initialState,
            isLoading: false,
          });
        }
      }
    }, refreshInMs);

    return () => {
      isActive = false;
      window.clearTimeout(timerId);
    };
  }, [state.accessToken]);

  if (state.isLoading) {
    // Hold admin pages while auth restoration is in progress.
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--gw-color-green) text-(--gw-color-cream)">
        Verifying admin session...
      </div>
    );
  }

  if (!state.accessToken || !state.admin) {
    // Preserve attempted admin route so login can return there after success.
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (
    state.admin.mustChangePassword &&
    location.pathname !== "/admin/change-password"
  ) {
    // Temporary-password admins cannot access the dashboard until changed.
    return <Navigate to="/admin/change-password" replace />;
  }

  return (
    // Child admin layouts read the verified admin identity/token from outlet context.
    <Outlet
      context={{
        admin: state.admin,
        accessToken: state.accessToken,
        authError: state.error,
      }}
    />
  );
}
