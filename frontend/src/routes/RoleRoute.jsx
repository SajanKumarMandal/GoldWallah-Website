import { Navigate, Outlet, useLocation } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/context/useAuth";

function status(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export default function RoleRoute({ allowedRoles = [], userRole }) {
  const location = useLocation();
  const { user } = useAuth();
  const effectiveRole = userRole || user?.role;

  if (!allowedRoles.includes(effectiveRole)) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const kycApproved = status(user?.kycStatus) === "APPROVED";
  const businessApproved = status(user?.businessVerificationStatus) === "APPROVED";

  if (
    effectiveRole === USER_ROLES.seller &&
    !kycApproved &&
    location.pathname !== ROUTES.sellerKyc
  ) {
    return <Navigate to={ROUTES.sellerKyc} replace />;
  }

  if (effectiveRole === USER_ROLES.jeweller) {
    if (!kycApproved && location.pathname !== ROUTES.jewellerKyc) {
      return <Navigate to={ROUTES.jewellerKyc} replace />;
    }

    if (
      kycApproved &&
      !businessApproved &&
      location.pathname !== ROUTES.jewellerKyc &&
      location.pathname !== ROUTES.jewellerVerification
    ) {
      return <Navigate to={ROUTES.jewellerVerification} replace />;
    }
  }

  return <Outlet />;
}
