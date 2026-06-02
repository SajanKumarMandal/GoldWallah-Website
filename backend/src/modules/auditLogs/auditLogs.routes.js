import { Router } from "express";

import { requireAdminAuth } from "../../middleware/adminAuth.js";
import { requireAdminPermission } from "../../middleware/requireAdminPermission.js";
import * as controller from "./auditLogs.controller.js";

export const auditLogsRouter = Router();

auditLogsRouter.get("/status", (_request, response) => {
  response.status(200).json({
    module: "audit-logs",
    status: "ready",
    capabilities: ["admin actions", "KYC actions", "listing and bid actions"],
  });
});

auditLogsRouter.get(
  "/",
  requireAdminAuth,
  requireAdminPermission("admin.audit.view"),
  controller.list,
);
