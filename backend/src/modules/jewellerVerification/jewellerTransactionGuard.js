export function requireJewellerCanTransact(user) {
  if (user?.role !== "JEWELLER") {
    const error = new Error("Jeweller role is required");
    error.statusCode = 403;
    error.code = "JEWELLER_ROLE_REQUIRED";
    throw error;
  }

  if (user.kycStatus !== "APPROVED") {
    const error = new Error("Approved KYC is required before transacting");
    error.statusCode = 403;
    error.code = "KYC_REQUIRED";
    throw error;
  }

  if (user.businessVerificationStatus !== "APPROVED") {
    const error = new Error("Approved business verification is required before transacting");
    error.statusCode = 403;
    error.code = "BUSINESS_VERIFICATION_REQUIRED";
    throw error;
  }

  if (user.commissionLockStatus !== "CLEAR") {
    const error = new Error("Commission dues must be cleared before transacting");
    error.statusCode = 403;
    error.code = "COMMISSION_LOCKED";
    throw error;
  }
}
