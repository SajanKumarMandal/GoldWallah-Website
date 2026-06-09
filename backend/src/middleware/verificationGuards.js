function createForbidden(message, code) {
  const error = new Error(message);
  error.statusCode = 403;
  error.code = code;
  return error;
}

export function requireSellerKycApproved(request, _response, next) {
  if (request.user?.role !== "SELLER") {
    next(createForbidden("Seller role is required", "SELLER_ROLE_REQUIRED"));
    return;
  }

  if (request.user.kycStatus !== "APPROVED") {
    next(createForbidden("Approved KYC is required", "KYC_REQUIRED"));
    return;
  }

  next();
}

export function requireJewellerKycApproved(request, _response, next) {
  if (request.user?.role !== "JEWELLER") {
    next(createForbidden("Jeweller role is required", "JEWELLER_ROLE_REQUIRED"));
    return;
  }

  if (request.user.kycStatus !== "APPROVED") {
    next(createForbidden("Approved KYC is required", "KYC_REQUIRED"));
    return;
  }

  next();
}

export function requireJewellerBusinessApproved(request, _response, next) {
  if (request.user?.businessVerificationStatus !== "APPROVED") {
    next(
      createForbidden(
        "Approved business verification is required",
        "BUSINESS_VERIFICATION_REQUIRED",
      ),
    );
    return;
  }

  next();
}

export function requireJewellerCanBid(request, response, next) {
  requireJewellerKycApproved(request, response, (kycError) => {
    if (kycError) {
      next(kycError);
      return;
    }

    requireJewellerBusinessApproved(request, response, (businessError) => {
      if (businessError) {
        next(businessError);
        return;
      }

      if (request.user?.commissionLockStatus !== "CLEAR") {
        next(
          createForbidden(
            "Commission dues must be cleared before bidding",
            "COMMISSION_LOCKED",
          ),
        );
        return;
      }

      next();
    });
  });
}

