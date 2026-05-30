import { Router } from "express";

import { requireAdminAuth } from "../../middleware/adminAuth.js";
import { requireAdminPermission } from "../../middleware/requireAdminPermission.js";
import * as controller from "./adminDashboard.controller.js";

export const adminDashboardRouter = Router();

adminDashboardRouter.use(requireAdminAuth);
adminDashboardRouter.use(requireAdminPermission("admin.dashboard.view"));

adminDashboardRouter.get("/summary", controller.summary);
adminDashboardRouter.get("/pending-verifications", controller.pending);
adminDashboardRouter.get("/recent-audit-logs", controller.audits);
adminDashboardRouter.get("/security-alerts", controller.alerts);
