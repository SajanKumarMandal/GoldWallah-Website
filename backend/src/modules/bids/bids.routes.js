import { Router } from "express";

import { authenticate, requireRole } from "../../middleware/auth.js";
import { requireJewellerCanBid } from "../../middleware/verificationGuards.js";
import * as bidsController from "./bids.controller.js";

export const bidsRouter = Router();

bidsRouter.get("/", (_request, response) => {
  response.status(200).json({
    module: "bids",
    status: "ready",
    capabilities: [
      "private jeweller bids",
      "seller-only bid visibility",
      "audit logging",
    ],
  });
});

bidsRouter.post(
  "/",
  authenticate,
  requireRole("JEWELLER"),
  requireJewellerCanBid,
  bidsController.createBid,
);

bidsRouter.get(
  "/my",
  authenticate,
  requireRole("JEWELLER"),
  bidsController.myBids,
);

bidsRouter.get(
  "/listings/:listingId",
  authenticate,
  requireRole("SELLER"),
  bidsController.listingBids,
);

bidsRouter.patch(
  "/:bidId/accept",
  authenticate,
  requireRole("SELLER"),
  bidsController.acceptBid,
);

bidsRouter.patch(
  "/:bidId/reject",
  authenticate,
  requireRole("SELLER"),
  bidsController.rejectBid,
);
