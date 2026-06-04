import { Navigate, Outlet } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/context/useAuth";

// Generic verification wrapper for routes that depend on a caller-supplied
// predicate instead of a fixed role/status rule.
export default function VerificationRoute({ isVerified, redirectTo = ROUTES.home }) {
  const { user } = useAuth();
  // Predicates can inspect the latest auth user; booleans support simple gates.
  const verificationResult =
    typeof isVerified === "function" ? isVerified(user) : isVerified;
  // Redirect can also be dynamic when the next step depends on user state.
  const nextPath =
    typeof redirectTo === "function" ? redirectTo(user) : redirectTo;

  if (!verificationResult) {
    return <Navigate to={nextPath || ROUTES.home} replace />;
  }

  return <Outlet />;
}
