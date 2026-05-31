import { Router } from "express";

import { adminRouter } from "../modules/admin/admin.routes.js";
import { adminDashboardRouter } from "../modules/adminDashboard/adminDashboard.routes.js";
import { adminCommissionsRouter } from "../modules/adminCommissions/adminCommissions.routes.js";
import { auditLogsRouter } from "../modules/auditLogs/auditLogs.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { bidsRouter } from "../modules/bids/bids.routes.js";
import { businessVerificationRouter } from "../modules/businessVerification/businessVerification.routes.js";
import {
  jewellerDashboardRouter,
  sellerDashboardRouter,
} from "../modules/dashboard/dashboard.routes.js";
import { dealsRouter } from "../modules/deals/deals.routes.js";
import { geoMatchingRouter } from "../modules/geoMatching/geoMatching.routes.js";
import { kycRouter } from "../modules/kyc/kyc.routes.js";
import {
  adminJewellerVerificationRouter,
  jewellerVerificationRouter,
} from "../modules/jewellerVerification/jewellerVerification.routes.js";
import { listingsRouter } from "../modules/listings/listings.routes.js";
import { mediaRouter } from "../modules/media/media.routes.js";
import { notificationsRouter } from "../modules/notifications/notifications.routes.js";
import { securityFraudRouter } from "../modules/securityFraud/securityFraud.routes.js";
import { usersRouter } from "../modules/users/users.routes.js";

// Central API mount table. Each feature module owns its controller/service/data
// logic; this file only decides the URL prefix for that module.
export const apiRouter = Router();

apiRouter.get("/status", (_request, response) => {
  response.status(200).json({
    status: "ok",
    modules: [
      "auth",
      "users",
      "kyc",
      "business-verification",
      "listings",
      "bids",
      "deals",
      "notifications",
      "geo-matching",
      "admin",
      "media",
      "audit-logs",
      "security-fraud",
    ],
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/seller", sellerDashboardRouter);
apiRouter.use("/jeweller", jewellerDashboardRouter);
apiRouter.use("/jeweller/verification", jewellerVerificationRouter);
apiRouter.use("/kyc", kycRouter);
apiRouter.use("/business-verification", businessVerificationRouter);
apiRouter.use("/listings", listingsRouter);
apiRouter.use("/bids", bidsRouter);
apiRouter.use("/deals", dealsRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/geo-matching", geoMatchingRouter);
apiRouter.use("/admin/dashboard", adminDashboardRouter);
apiRouter.use("/admin/commissions", adminCommissionsRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/admin/jeweller-verifications", adminJewellerVerificationRouter);
apiRouter.use("/media", mediaRouter);
apiRouter.use("/audit-logs", auditLogsRouter);
apiRouter.use("/security-fraud", securityFraudRouter);
