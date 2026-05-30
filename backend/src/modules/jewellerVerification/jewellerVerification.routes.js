import { Router } from "express";

import { authenticate, requireRole } from "../../middleware/auth.js";
import { requireAdminAuth } from "../../middleware/adminAuth.js";
import { requireAdminPermission } from "../../middleware/requireAdminPermission.js";
import * as controller from "./jewellerVerification.controller.js";

export const jewellerVerificationRouter = Router();
export const adminJewellerVerificationRouter = Router();

jewellerVerificationRouter.get("/", (_request, response) => {
  response.status(200).json({
    module: "jeweller-verification",
    status: "ready",
    capabilities: [
      "jeweller business verification submission",
      "jeweller business verification status",
    ],
  });
});

jewellerVerificationRouter.post(
  "/",
  authenticate,
  requireRole("JEWELLER"),
  controller.uploadJewellerVerificationFiles,
  controller.submitVerification,
);

jewellerVerificationRouter.get(
  "/me",
  authenticate,
  requireRole("JEWELLER"),
  controller.myVerification,
);

adminJewellerVerificationRouter.get(
  "/",
  requireAdminAuth,
  requireAdminPermission("admin.business.view"),
  controller.listVerifications,
);

adminJewellerVerificationRouter.get(
  "/:verificationId",
  requireAdminAuth,
  requireAdminPermission("admin.business.view"),
  controller.verificationDetail,
);

adminJewellerVerificationRouter.patch(
  "/:verificationId/approve",
  requireAdminAuth,
  requireAdminPermission("admin.business.approve"),
  controller.approveVerification,
);

adminJewellerVerificationRouter.patch(
  "/:verificationId/reject",
  requireAdminAuth,
  requireAdminPermission("admin.business.reject"),
  controller.rejectVerification,
);
