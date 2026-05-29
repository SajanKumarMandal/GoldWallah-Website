import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";

export function getPostAuthRedirectPath(user) {
  if (user?.role === USER_ROLES.seller) {
    return ROUTES.sellerDashboard;
  }

  if (user?.role === USER_ROLES.jeweller) {
    return ROUTES.jewellerDashboard;
  }

  if (user?.role === USER_ROLES.admin) {
    return ROUTES.adminKyc;
  }

  return ROUTES.home;
}
