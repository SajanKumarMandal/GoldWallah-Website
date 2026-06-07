import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";
import { createRateLimiter } from "../../middleware/rateLimiter.js";
import * as controller from "./notifications.controller.js";

export const notificationsRouter = Router();

const notificationStreamLimiter = createRateLimiter({
  name: "notification-stream",
  windowMs: 5 * 60 * 1000,
  limit: 60,
  message: {
    error: {
      message: "Too many notification stream attempts. Please try again later.",
      code: "NOTIFICATION_STREAM_RATE_LIMITED",
    },
  },
});

notificationsRouter.get("/", authenticate, controller.myNotifications);
notificationsRouter.get(
  "/stream",
  notificationStreamLimiter,
  authenticate,
  controller.streamNotifications,
);
notificationsRouter.patch("/read-all", authenticate, controller.markAllRead);
notificationsRouter.patch("/:notificationId/read", authenticate, controller.markRead);
