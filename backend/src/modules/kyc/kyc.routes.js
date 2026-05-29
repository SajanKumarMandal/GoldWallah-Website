import { Router } from "express";

import { authenticate, requireRole } from "../../middleware/auth.js";
import * as kycController from "./kyc.controller.js";

export const kycRouter = Router();

kycRouter.get("/", (_request, response) => {
  response.status(200).json({
    module: "kyc",
    status: "ready",
    capabilities: [
      "seller KYC submission",
      "seller KYC status",
      "admin seller KYC review",
    ],
  });
});

kycRouter.post(
  "/seller",
  authenticate,
  requireRole("SELLER"),
  kycController.uploadSellerKycImages,
  kycController.submitSeller,
);

kycRouter.get(
  "/seller/me",
  authenticate,
  requireRole("SELLER"),
  kycController.sellerMe,
);

kycRouter.get(
  "/admin/seller",
  authenticate,
  requireRole("ADMIN"),
  kycController.listSellerSubmissions,
);

kycRouter.get(
  "/admin/seller/:kycId",
  authenticate,
  requireRole("ADMIN"),
  kycController.sellerSubmissionDetail,
);

kycRouter.patch(
  "/admin/seller/:kycId/approve",
  authenticate,
  requireRole("ADMIN"),
  kycController.approveSellerSubmission,
);

kycRouter.patch(
  "/admin/seller/:kycId/reject",
  authenticate,
  requireRole("ADMIN"),
  kycController.rejectSellerSubmission,
);
