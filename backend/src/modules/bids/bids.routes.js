import { Router } from "express";

import { authenticate, requireRole } from "../../middleware/auth.js";

export const bidsRouter = Router();

function createBidGuard(request, _response, next) {
  const hasApprovedKyc = request.user?.kycStatus === "APPROVED";
  const hasApprovedBusiness =
    request.user?.businessVerificationStatus === "APPROVED";

  if (!hasApprovedKyc || !hasApprovedBusiness) {
    const error = new Error("Verification is required before placing bids.");
    error.statusCode = 403;
    error.code = "VERIFICATION_REQUIRED";
    next(error);
    return;
  }

  next();
}

bidsRouter.get("/", (_request, response) => {
  response.status(200).json({
    module: "bids",
    status: "planned",
    capabilities: [
      "private jeweller bids",
      "seller-only bid visibility",
      "audit logging",
    ],
  });
});

bidsRouter.post(
  "/",
  authenticate,
  requireRole("JEWELLER"),
  createBidGuard,
  (_request, response) => {
    // TODO: Implement bid creation after the bids module is built.
    response.status(501).json({
      message: "Bid creation is not implemented yet",
      error: {
        message: "Bid creation is not implemented yet",
        code: "NOT_IMPLEMENTED",
      },
    });
  },
);
