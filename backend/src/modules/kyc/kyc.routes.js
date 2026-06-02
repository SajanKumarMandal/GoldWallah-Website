import { Router } from "express";

import { authenticate, requireRole } from "../../middleware/auth.js";
import { requireAdminAuth } from "../../middleware/adminAuth.js";
import { requireAdminPermission } from "../../middleware/requireAdminPermission.js";
import * as kycController from "./kyc.controller.js";

export const kycRouter = Router();

kycRouter.get("/", (_request, response) => {
  response.status(200).json({
    module: "kyc",
    status: "ready",
    capabilities: [
      "seller KYC submission",
      "jeweller KYC submission",
      "role-scoped KYC status",
      "admin seller and jeweller KYC review",
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

kycRouter.post(
  "/jeweller",
  authenticate,
  requireRole("JEWELLER"),
  kycController.uploadSellerKycImages,
  kycController.submitJeweller,
);

kycRouter.get(
  "/jeweller/me",
  authenticate,
  requireRole("JEWELLER"),
  kycController.jewellerMe,
);

kycRouter.get(
  "/admin/seller",
  requireAdminAuth,
  requireAdminPermission("admin.kyc.seller.view"),
  kycController.listSellerSubmissions,
);

kycRouter.get(
  "/admin/seller/:kycId",
  requireAdminAuth,
  requireAdminPermission("admin.kyc.seller.view"),
  kycController.sellerSubmissionDetail,
);

kycRouter.patch(
  "/admin/seller/:kycId/approve",
  requireAdminAuth,
  requireAdminPermission("admin.kyc.seller.approve"),
  kycController.approveSellerSubmission,
);

kycRouter.patch(
  "/admin/seller/:kycId/reject",
  requireAdminAuth,
  requireAdminPermission("admin.kyc.seller.reject"),
  kycController.rejectSellerSubmission,
);

kycRouter.get(
  "/admin/jeweller",
  requireAdminAuth,
  requireAdminPermission("admin.kyc.jeweller.view"),
  kycController.listJewellerSubmissions,
);

kycRouter.get(
  "/admin/jeweller/:kycId",
  requireAdminAuth,
  requireAdminPermission("admin.kyc.jeweller.view"),
  kycController.jewellerSubmissionDetail,
);

kycRouter.patch(
  "/admin/jeweller/:kycId/approve",
  requireAdminAuth,
  requireAdminPermission("admin.kyc.jeweller.approve"),
  kycController.approveJewellerSubmission,
);

kycRouter.patch(
  "/admin/jeweller/:kycId/reject",
  requireAdminAuth,
  requireAdminPermission("admin.kyc.jeweller.reject"),
  kycController.rejectJewellerSubmission,
);
