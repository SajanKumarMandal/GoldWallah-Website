import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";

const APPROVED_STATUS = "APPROVED";

function normalizeStatus(status) {
  return typeof status === "string" ? status.trim().toUpperCase() : "";
}

export function isSellerKycApproved(user) {
  return normalizeStatus(user?.kycStatus) === APPROVED_STATUS;
}

export function isJewellerKycApproved(user) {
  return normalizeStatus(user?.kycStatus) === APPROVED_STATUS;
}

export function isJewellerBusinessVerified(user) {
  return normalizeStatus(user?.businessVerificationStatus) === APPROVED_STATUS;
}

export function canSellerAccessMarketplace(user) {
  return user?.role === USER_ROLES.seller && isSellerKycApproved(user);
}

export function canJewellerAccessMarketplace(user) {
  return (
    user?.role === USER_ROLES.jeweller &&
    isJewellerKycApproved(user) &&
    isJewellerBusinessVerified(user)
  );
}

export function getSellerVerificationRedirectPath(user) {
  return isSellerKycApproved(user) ? ROUTES.sellerDashboard : ROUTES.sellerKyc;
}

export function getJewellerVerificationRedirectPath(user) {
  if (!isJewellerKycApproved(user)) {
    return ROUTES.jewellerKyc;
  }

  if (!isJewellerBusinessVerified(user)) {
    return ROUTES.jewellerVerification;
  }

  return ROUTES.jewellerDashboard;
}

export function getPostAuthRedirectPath(user) {
  if (user?.role === USER_ROLES.seller) {
    return getSellerVerificationRedirectPath(user);
  }

  if (user?.role === USER_ROLES.jeweller) {
    return getJewellerVerificationRedirectPath(user);
  }

  if (user?.role === USER_ROLES.admin) {
    return ROUTES.adminKyc;
  }

  return ROUTES.home;
}
