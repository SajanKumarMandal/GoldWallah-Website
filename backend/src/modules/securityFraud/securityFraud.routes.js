import { createModuleStatusRouter } from "../../utils/moduleStatusRouter.js";

export const securityFraudRouter = createModuleStatusRouter("security-fraud", [
  "rate limiting",
  "fraud signals",
  "sensitive event monitoring",
]);
