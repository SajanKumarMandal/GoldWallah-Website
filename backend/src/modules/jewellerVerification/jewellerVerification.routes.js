import { Router } from "express";

import { authenticate, requireRole } from "../../middleware/auth.js";
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
  authenticate,
  requireRole("ADMIN"),
  controller.listVerifications,
);

adminJewellerVerificationRouter.get(
  "/:verificationId",
  authenticate,
  requireRole("ADMIN"),
  controller.verificationDetail,
);

adminJewellerVerificationRouter.patch(
  "/:verificationId/approve",
  authenticate,
  requireRole("ADMIN"),
  controller.approveVerification,
);

adminJewellerVerificationRouter.patch(
  "/:verificationId/reject",
  authenticate,
  requireRole("ADMIN"),
  controller.rejectVerification,
);
