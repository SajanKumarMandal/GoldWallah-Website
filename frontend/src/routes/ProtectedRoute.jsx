import { Navigate, Outlet, useLocation } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";

export default function ProtectedRoute({ isAllowed }) {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const canAccess = typeof isAllowed === "boolean" ? isAllowed : isAuthenticated;

  if (!canAccess) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
