import { Navigate, Outlet } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";

export default function VerificationRoute({ isVerified, redirectTo = ROUTES.home }) {
  const { user } = useAuth();
  const verificationResult =
    typeof isVerified === "function" ? isVerified(user) : isVerified;

  if (!verificationResult) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
