import { createModuleStatusRouter } from "../../utils/moduleStatusRouter.js";

export const kycRouter = createModuleStatusRouter("kyc", [
  "document submission",
  "admin approval",
  "listing authorization",
]);
