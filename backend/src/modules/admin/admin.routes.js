import rateLimit from "express-rate-limit";
import { Router } from "express";

import { requireAdminAuth } from "../../middleware/adminAuth.js";
import { requireAdminPermission } from "../../middleware/requireAdminPermission.js";
import * as adminController from "./admin.controller.js";

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again later.",
    error: {
      message: "Too many login attempts. Please try again later.",
      code: "ADMIN_LOGIN_RATE_LIMITED",
    },
  },
});

export const adminRouter = Router();

adminRouter.get("/", (_request, response) => {
  response.status(200).json({
    module: "admin",
    status: "ready",
    capabilities: ["admin auth", "RBAC", "audit logging", "sub-admins"],
  });
});

adminRouter.post("/auth/login", adminLoginLimiter, adminController.login);
adminRouter.post("/auth/refresh", adminController.refresh);
adminRouter.post(
  "/auth/logout",
  requireAdminAuth,
  adminController.logout,
);
adminRouter.get("/auth/me", requireAdminAuth, adminController.me);
adminRouter.post(
  "/auth/change-password",
  requireAdminAuth,
  adminController.changePassword,
);

adminRouter.get(
  "/sub-admins",
  requireAdminAuth,
  requireAdminPermission("admin.subadmins.view"),
  adminController.listSubAdmins,
);
adminRouter.post(
  "/sub-admins",
  requireAdminAuth,
  requireAdminPermission("admin.subadmins.create"),
  adminController.createSubAdminHandler,
);
adminRouter.patch(
  "/sub-admins/:id/status",
  requireAdminAuth,
  requireAdminPermission("admin.subadmins.suspend"),
  adminController.updateSubAdminStatusHandler,
);
