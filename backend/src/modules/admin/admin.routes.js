import { Router } from "express";

import { requireAdminAuth } from "../../middleware/adminAuth.js";
import { createRateLimiter } from "../../middleware/rateLimiter.js";
import { requireAdminPermission } from "../../middleware/requireAdminPermission.js";
import * as adminController from "./admin.controller.js";

// Admin login has its own limiter because admin credentials are higher risk
// than ordinary user credentials.
const adminLoginLimiter = createRateLimiter({
  name: "admin-login",
  windowMs: 15 * 60 * 1000,
  limit: 25,
  message: {
    message: "Too many login attempts. Please try again later.",
    error: {
      message: "Too many login attempts. Please try again later.",
      code: "ADMIN_LOGIN_RATE_LIMITED",
    },
  },
});

// Admin refresh/logout can happen frequently from the console, but still need a
// ceiling to prevent refresh loops from stressing the API.
const adminSessionLimiter = createRateLimiter({
  name: "admin-session",
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: {
    message: "Too many admin session requests. Please try again later.",
    error: {
      message: "Too many admin session requests. Please try again later.",
      code: "ADMIN_SESSION_RATE_LIMITED",
    },
  },
});

export const adminRouter = Router();

adminRouter.get("/", (_request, response) => {
  // Lightweight admin module status endpoint.
  response.status(200).json({
    module: "admin",
    status: "ready",
    capabilities: ["admin auth", "RBAC", "audit logging", "sub-admins"],
  });
});

// Admin auth endpoints. Controllers enforce trusted browser origin, CSRF header
// checks for unsafe methods, and secure refresh-cookie handling.
adminRouter.post("/auth/login", adminLoginLimiter, adminController.login);
adminRouter.post("/auth/refresh", adminSessionLimiter, adminController.refresh);
adminRouter.post("/auth/logout", adminSessionLimiter, adminController.logout);
adminRouter.get("/auth/me", requireAdminAuth, adminController.me);
adminRouter.post(
  "/auth/change-password",
  requireAdminAuth,
  adminController.changePassword,
);
adminRouter.post(
  "/auth/mfa/setup",
  requireAdminAuth,
  adminController.beginMfaSetup,
);
adminRouter.post(
  "/auth/mfa/confirm",
  requireAdminAuth,
  adminController.confirmMfaSetup,
);

adminRouter.get(
  "/sub-admins",
  requireAdminAuth,
  requireAdminPermission("admin.subadmins.view"),
  adminController.listSubAdmins,
);
adminRouter.get(
  "/roles",
  requireAdminAuth,
  requireAdminPermission("admin.subadmins.view"),
  adminController.listRoles,
);
adminRouter.get(
  "/users",
  requireAdminAuth,
  requireAdminPermission("admin.users.view"),
  adminController.listPlatformUsersHandler,
);
adminRouter.patch(
  "/users/:userId/block",
  requireAdminAuth,
  requireAdminPermission("admin.users.block"),
  adminController.blockPlatformUserHandler,
);
adminRouter.patch(
  "/users/:userId/unblock",
  requireAdminAuth,
  requireAdminPermission("admin.users.unblock"),
  adminController.unblockPlatformUserHandler,
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
