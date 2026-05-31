import { Router } from "express";

import { authenticate, requireRole } from "../../middleware/auth.js";
import * as controller from "./geoMatching.controller.js";

export const geoMatchingRouter = Router();

geoMatchingRouter.get(
  "/listings",
  authenticate,
  requireRole("JEWELLER"),
  controller.matchedListings,
);

geoMatchingRouter.get(
  "/jewellers",
  authenticate,
  requireRole("SELLER"),
  controller.nearbyJewellers,
);
