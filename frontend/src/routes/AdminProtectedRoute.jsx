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

export default function AdminProtectedRoute() {
  const location = useLocation();
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--gw-color-green) text-(--gw-color-cream)">
        Verifying admin session...
      </div>
    );
  }

  if (!state.accessToken || !state.admin) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (
    state.admin.mustChangePassword &&
    location.pathname !== "/admin/change-password"
  ) {
    return <Navigate to="/admin/change-password" replace />;
  }

  return (
    <Outlet
      context={{
        admin: state.admin,
        accessToken: state.accessToken,
        authError: state.error,
      }}
    />
  );
}
