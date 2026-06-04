import { Navigate, Outlet, useLocation } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";

// Authenticated route wrapper. It waits for refresh-cookie restoration before
// deciding whether to render protected content or send the user to login.
export default function ProtectedRoute({ isAllowed }) {
  const location = useLocation();
  const { isAuthenticated, isSessionLoading } = useAuth();
  // Tests or parent routes can override access explicitly with isAllowed.
  const canAccess = typeof isAllowed === "boolean" ? isAllowed : isAuthenticated;

  if (isSessionLoading) {
    // Avoid redirect flicker while AuthProvider restores a valid server session.
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--gw-color-cream) px-4 text-center text-sm font-semibold text-(--gw-color-green)">
        Restoring secure session...
      </div>
    );
  }

  if (!canAccess) {
    // Preserve the attempted location so login can redirect back if needed.
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
