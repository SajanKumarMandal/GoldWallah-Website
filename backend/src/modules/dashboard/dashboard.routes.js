import { Router } from "express";

import { authenticate, requireRole } from "../../middleware/auth.js";
import * as dashboardController from "./dashboard.controller.js";

export const sellerDashboardRouter = Router();
export const jewellerDashboardRouter = Router();

sellerDashboardRouter.get(
  "/dashboard",
  authenticate,
  requireRole("SELLER"),
  dashboardController.sellerDashboard,
);

jewellerDashboardRouter.get(
  "/dashboard",
  authenticate,
  requireRole("JEWELLER"),
  dashboardController.jewellerDashboard,
);
