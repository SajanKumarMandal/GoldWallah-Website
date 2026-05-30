import { Router } from "express";

import { authenticate, requireRole } from "../../middleware/auth.js";
import * as listingsController from "./listings.controller.js";

export const listingsRouter = Router();

listingsRouter.get("/", (_request, response) => {
  response.status(200).json({
    module: "listings",
    status: "ready",
    capabilities: [
      "seller gold listings",
      "KYC-gated creation",
      "seller-owned listing management",
    ],
  });
});

listingsRouter.post(
  "/",
  authenticate,
  requireRole("SELLER"),
  listingsController.uploadListingImages,
  listingsController.createListing,
);

listingsRouter.get(
  "/my",
  authenticate,
  requireRole("SELLER"),
  listingsController.myListings,
);

listingsRouter.get(
  "/marketplace",
  authenticate,
  requireRole("JEWELLER"),
  listingsController.marketplaceListings,
);

listingsRouter.get(
  "/marketplace/:listingId",
  authenticate,
  requireRole("JEWELLER"),
  listingsController.marketplaceListingDetail,
);

listingsRouter.get(
  "/:listingId",
  authenticate,
  requireRole("SELLER"),
  listingsController.listingDetail,
);

listingsRouter.patch(
  "/:listingId/cancel",
  authenticate,
  requireRole("SELLER"),
  listingsController.cancelListing,
);

listingsRouter.patch(
  "/:listingId",
  authenticate,
  requireRole("SELLER"),
  listingsController.uploadListingImages,
  listingsController.updateListing,
);
