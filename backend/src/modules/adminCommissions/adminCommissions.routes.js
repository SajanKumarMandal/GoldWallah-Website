import { Router } from "express";

import { requireAdminAuth } from "../../middleware/adminAuth.js";
import { requireAdminPermission } from "../../middleware/requireAdminPermission.js";
import * as controller from "./adminCommissions.controller.js";

export const adminCommissionsRouter = Router();

adminCommissionsRouter.get(
  "/",
  requireAdminAuth,
  requireAdminPermission("admin.commissions.view"),
  controller.list,
);
adminCommissionsRouter.patch(
  "/:commissionId/mark-paid",
  requireAdminAuth,
  requireAdminPermission("admin.commissions.settle"),
  controller.markPaid,
);
adminCommissionsRouter.patch(
  "/:commissionId/waive",
  requireAdminAuth,
  requireAdminPermission("admin.commissions.waive"),
  controller.waive,
);
