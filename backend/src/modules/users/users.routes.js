import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";
import * as usersController from "./users.controller.js";

export const usersRouter = Router();

usersRouter.get("/", (_request, response) => {
  response.status(200).json({
    module: "users",
    status: "ready",
    capabilities: ["current user profile", "seller profiles", "jeweller profiles"],
  });
});

usersRouter.get("/me", authenticate, usersController.me);
