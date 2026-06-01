import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { authenticate } from "../../middleware/auth.js";
import * as usersController from "./users.controller.js";

export const usersRouter = Router();

const updateLocationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many location updates. Please try again later.",
    code: "RATE_LIMITED",
  },
});

usersRouter.get("/", (_request, response) => {
  response.status(200).json({
    module: "users",
    status: "ready",
    capabilities: ["current user profile", "seller profiles", "jeweller profiles"],
  });
});

usersRouter.get("/me", authenticate, usersController.me);
usersRouter.patch(
  "/me/location",
  authenticate,
  updateLocationRateLimit,
  usersController.updateLocation,
);
usersRouter.patch(
  "/location",
  authenticate,
  updateLocationRateLimit,
  usersController.updateLocation,
);
