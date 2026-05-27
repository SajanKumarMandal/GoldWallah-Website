import { Navigate, Outlet } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";

export default function RoleRoute({ allowedRoles = [], userRole }) {
  const { user } = useAuth();
  const effectiveRole = userRole || user?.role;

  if (!allowedRoles.includes(effectiveRole)) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return <Outlet />;
}
