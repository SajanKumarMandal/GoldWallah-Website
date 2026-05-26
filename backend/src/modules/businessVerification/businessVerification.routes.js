import { createModuleStatusRouter } from "../../utils/moduleStatusRouter.js";

export const businessVerificationRouter = createModuleStatusRouter(
  "business-verification",
  ["jeweller onboarding", "admin approval", "bid authorization"],
);
