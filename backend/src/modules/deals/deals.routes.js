import { Router } from "express";

import { authenticate } from "../../middleware/auth.js";
import * as controller from "./deals.controller.js";

export const dealsRouter = Router();

dealsRouter.get("/", authenticate, controller.myDeals);
dealsRouter.get("/:dealId", authenticate, controller.dealDetail);
dealsRouter.patch("/:dealId/complete", authenticate, controller.complete);
