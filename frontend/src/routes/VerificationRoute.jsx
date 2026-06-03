import { Navigate, Outlet } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";

export default function VerificationRoute({ isVerified, redirectTo = ROUTES.home }) {
  const { user } = useAuth();
  const verificationResult =
    typeof isVerified === "function" ? isVerified(user) : isVerified;
  const nextPath =
    typeof redirectTo === "function" ? redirectTo(user) : redirectTo;

  if (!verificationResult) {
    return <Navigate to={nextPath || ROUTES.home} replace />;
  }

  return <Outlet />;
}
