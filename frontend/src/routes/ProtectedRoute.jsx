import { Navigate, Outlet, useLocation } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";

export default function ProtectedRoute({ isAllowed }) {
  const location = useLocation();
  const { isAuthenticated, isSessionLoading } = useAuth();
  const canAccess = typeof isAllowed === "boolean" ? isAllowed : isAuthenticated;

  if (isSessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--gw-color-cream) px-4 text-center text-sm font-semibold text-(--gw-color-green)">
        Restoring secure session...
      </div>
    );
  }

  if (!canAccess) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
