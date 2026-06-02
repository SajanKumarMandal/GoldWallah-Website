import rateLimit from "express-rate-limit";
import { Router } from "express";

import { authenticate, requireRole } from "../../middleware/auth.js";
import * as controller from "./commissions.controller.js";

export const commissionsRouter = Router();

const commissionPaymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: "Too many payment submissions. Please try again later.",
      code: "COMMISSION_PAYMENT_RATE_LIMITED",
    },
  },
});

commissionsRouter.get(
  "/my",
  authenticate,
  requireRole("JEWELLER"),
  controller.myCommissions,
);

commissionsRouter.patch(
  "/:commissionId/payment",
  commissionPaymentLimiter,
  authenticate,
  requireRole("JEWELLER"),
  controller.submitPayment,
);
