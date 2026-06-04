import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";

const APPROVED_STATUS = "APPROVED";

function normalizeStatus(status) {
  // API values should already be uppercase, but normalization keeps redirect
  // checks resilient to older sessions or defensive caller input.
  return typeof status === "string" ? status.trim().toUpperCase() : "";
}

export function isSellerKycApproved(user) {
  // Sellers can access marketplace workflows only after identity KYC approval.
  return normalizeStatus(user?.kycStatus) === APPROVED_STATUS;
}

export function isJewellerKycApproved(user) {
  // Jewellers need identity KYC before business verification and bidding.
  return normalizeStatus(user?.kycStatus) === APPROVED_STATUS;
}

export function isJewellerBusinessVerified(user) {
  // Business verification is the second jeweller gate after KYC approval.
  return normalizeStatus(user?.businessVerificationStatus) === APPROVED_STATUS;
}

export function canSellerAccessMarketplace(user) {
  // Seller marketplace access currently means the seller can create listings.
  return user?.role === USER_ROLES.seller && isSellerKycApproved(user);
}

export function canJewellerAccessMarketplace(user) {
  // Jeweller marketplace access requires both identity and business approval.
  return (
    user?.role === USER_ROLES.jeweller &&
    isJewellerKycApproved(user) &&
    isJewellerBusinessVerified(user)
  );
}

export function getSellerVerificationRedirectPath(user) {
  // Route sellers to the next required verification step after authentication.
  return isSellerKycApproved(user) ? ROUTES.sellerDashboard : ROUTES.sellerKyc;
}

export function getJewellerVerificationRedirectPath(user) {
  // Jewellers complete identity KYC first, then business verification, before
  // reaching the normal dashboard.
  if (!isJewellerKycApproved(user)) {
    return ROUTES.jewellerKyc;
  }

  if (!isJewellerBusinessVerified(user)) {
    return ROUTES.jewellerVerification;
  }

  return ROUTES.jewellerDashboard;
}

export function getPostAuthRedirectPath(user) {
  // Single post-login/register redirect decision used by email, OTP, and social
  // auth so all methods enforce the same verification gates.
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
