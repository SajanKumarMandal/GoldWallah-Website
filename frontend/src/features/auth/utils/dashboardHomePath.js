import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";

// Resolve the neutral dashboard destination for the authenticated user's role.
// Verification-specific redirects live in postAuthRedirect.js.
export function getDashboardHomePath(user) {
  if (user?.role === USER_ROLES.seller) {
    return ROUTES.sellerDashboard;
  }

  if (user?.role === USER_ROLES.jeweller) {
    return ROUTES.jewellerDashboard;
  }

  if (user?.role === USER_ROLES.admin) {
    return ROUTES.adminDashboard;
  }

  return ROUTES.home;
}
