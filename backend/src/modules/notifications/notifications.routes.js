import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";
import * as controller from "./notifications.controller.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", authenticate, controller.myNotifications);
notificationsRouter.patch("/read-all", authenticate, controller.markAllRead);
notificationsRouter.patch("/:notificationId/read", authenticate, controller.markRead);
