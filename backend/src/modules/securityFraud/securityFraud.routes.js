import { Router } from "express";

import { requireAdminAuth } from "../../middleware/adminAuth.js";
import { requireAdminPermission } from "../../middleware/requireAdminPermission.js";
import * as controller from "./securityFraud.controller.js";

export const securityFraudRouter = Router();

securityFraudRouter.get("/", (_request, response) => {
  response.status(200).json({
    module: "security-fraud",
    status: "ready",
    capabilities: [
      "rate limiting",
      "fraud signals",
      "sensitive event monitoring",
    ],
  });
});

securityFraudRouter.get(
  "/alerts",
  requireAdminAuth,
  requireAdminPermission("admin.audit.view"),
  controller.alerts,
);
