import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import {
  clearAdminSession,
  readAdminSession,
  writeAdminSession,
} from "@/features/admin/auth/utils/adminTokenStorage";
import { getAdminMe } from "@/features/admin/auth/services/adminAuthService";

export default function AdminProtectedRoute() {
  const location = useLocation();
  const [state, setState] = useState({
    isLoading: true,
    accessToken: "",
    refreshToken: "",
    admin: null,
    error: "",
  });

  useEffect(() => {
    let isMounted = true;
    const session = readAdminSession();

    async function verifySession() {
      if (!session?.accessToken) {
        clearAdminSession();
        if (isMounted) {
          setState({
            isLoading: false,
            accessToken: "",
            refreshToken: "",
            admin: null,
            error: "",
          });
        }
        return;
      }

      try {
        const result = await getAdminMe(session.accessToken);
        const admin = result?.data?.admin || null;
        writeAdminSession({
          admin,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        });

        if (isMounted) {
          setState({
            isLoading: false,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            admin,
            error: "",
          });
        }
      } catch (error) {
        clearAdminSession();
        if (isMounted) {
          setState({
            isLoading: false,
            accessToken: "",
            refreshToken: "",
            admin: null,
            error: error.status === 401 ? "" : "Unable to verify admin session.",
          });
        }
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

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
        refreshToken: state.refreshToken,
        authError: state.error,
      }}
    />
  );
}
