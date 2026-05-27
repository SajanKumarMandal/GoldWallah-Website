import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";

export function getPostAuthRedirectPath(user) {
  if (user?.role === USER_ROLES.seller) {
    return user.kycStatus === "APPROVED" ? ROUTES.sellerDashboard : ROUTES.sellerKyc;
  }

  if (user?.role === USER_ROLES.jeweller) {
    return user.kycStatus === "APPROVED" &&
      user.businessVerificationStatus === "APPROVED"
      ? ROUTES.jewellerDashboard
      : ROUTES.jewellerVerification;
  }

  return ROUTES.home;
}
