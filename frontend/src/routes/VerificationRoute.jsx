import { Navigate, Outlet } from "react-router-dom";

import { ROUTES } from "@/constants/routes";

export default function VerificationRoute({ isVerified }) {
  if (!isVerified) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return <Outlet />;
}
