import { Router } from "express";

import { authenticate, requireRole } from "../../middleware/auth.js";
import * as bidsController from "./bids.controller.js";

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
    status: "ready",
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
  bidsController.createBid,
);

bidsRouter.get(
  "/my",
  authenticate,
  requireRole("JEWELLER"),
  bidsController.myBids,
);

bidsRouter.get(
  "/listings/:listingId",
  authenticate,
  requireRole("SELLER"),
  bidsController.listingBids,
);

bidsRouter.patch(
  "/:bidId/accept",
  authenticate,
  requireRole("SELLER"),
  bidsController.acceptBid,
);

bidsRouter.patch(
  "/:bidId/reject",
  authenticate,
  requireRole("SELLER"),
  bidsController.rejectBid,
);
