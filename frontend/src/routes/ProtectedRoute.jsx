import { Navigate, Outlet, useLocation } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

export default function ProtectedRoute({ isAllowed }) {
  const location = useLocation();

  if (!isAllowed) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
