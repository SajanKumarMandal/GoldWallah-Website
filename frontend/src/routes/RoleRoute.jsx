import { Navigate, Outlet } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

export default function RoleRoute({ allowedRoles = [], userRole }) {
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return <Outlet />;
}
