import { Router } from "express";

import { authenticate, requireRole } from "../../middleware/auth.js";
import * as bidsController from "../bids/bids.controller.js";
import * as dashboardController from "./dashboard.controller.js";

export const sellerDashboardRouter = Router();
export const jewellerDashboardRouter = Router();

sellerDashboardRouter.get(
  "/dashboard",
  authenticate,
  requireRole("SELLER"),
  dashboardController.sellerDashboard,
);

sellerDashboardRouter.get(
  "/listings/:listingId/bids",
  authenticate,
  requireRole("SELLER"),
  bidsController.listingBids,
);

jewellerDashboardRouter.get(
  "/dashboard",
  authenticate,
  requireRole("JEWELLER"),
  dashboardController.jewellerDashboard,
);
