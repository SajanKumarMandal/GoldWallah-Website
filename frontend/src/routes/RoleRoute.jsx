import { Navigate, Outlet, useLocation } from "react-router-dom";

import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/features/auth/context/useAuth";

function status(value) {
  // Normalize backend status values before comparing verification gates.
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

// Role and verification gate for seller/jeweller dashboard routes.
export default function RoleRoute({ allowedRoles = [], userRole }) {
  const location = useLocation();
  const { user } = useAuth();
  // userRole lets tests or nested route setups override the context role.
  const effectiveRole = userRole || user?.role;

  if (!allowedRoles.includes(effectiveRole)) {
    // Unknown or unauthorized roles are sent to the public home page.
    return <Navigate to={ROUTES.home} replace />;
  }

  // Frontend gates mirror backend enforcement so users see the next required
  // verification step before hitting protected APIs.
  const kycApproved = status(user?.kycStatus) === "APPROVED";
  const businessApproved = status(user?.businessVerificationStatus) === "APPROVED";

  if (
    effectiveRole === USER_ROLES.seller &&
    !kycApproved &&
    location.pathname !== ROUTES.sellerKyc
  ) {
    // Sellers must finish identity KYC before accessing seller workflows.
    return <Navigate to={ROUTES.sellerKyc} replace />;
  }

  if (effectiveRole === USER_ROLES.jeweller) {
    if (!kycApproved && location.pathname !== ROUTES.jewellerKyc) {
      // Jewellers complete identity KYC first.
      return <Navigate to={ROUTES.jewellerKyc} replace />;
    }

    if (
      kycApproved &&
      !businessApproved &&
      location.pathname !== ROUTES.jewellerKyc &&
      location.pathname !== ROUTES.jewellerVerification
    ) {
      // After KYC, jewellers must complete business verification before bidding.
      return <Navigate to={ROUTES.jewellerVerification} replace />;
    }
  }

  return <Outlet />;
}
