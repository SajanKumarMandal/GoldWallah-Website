import { Router } from "express";

import { authenticate, requireRole } from "../../middleware/auth.js";

export const listingsRouter = Router();

function createListingGuard(request, _response, next) {
  if (request.user?.kycStatus !== "APPROVED") {
    const error = new Error("KYC approval is required before listing gold.");
    error.statusCode = 403;
    error.code = "KYC_REQUIRED";
    next(error);
    return;
  }

  next();
}

listingsRouter.get("/", (_request, response) => {
  response.status(200).json({
    module: "listings",
    status: "planned",
    capabilities: [
      "seller gold listings",
      "KYC-gated creation",
      "cursor pagination",
    ],
  });
});

listingsRouter.post(
  "/",
  authenticate,
  requireRole("SELLER"),
  createListingGuard,
  (_request, response) => {
    // TODO: Implement listing creation after the listings module is built.
    response.status(501).json({
      message: "Listing creation is not implemented yet",
      error: {
        message: "Listing creation is not implemented yet",
        code: "NOT_IMPLEMENTED",
      },
    });
  },
);
