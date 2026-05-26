import { createModuleStatusRouter } from "../../utils/moduleStatusRouter.js";

export const adminRouter = createModuleStatusRouter("admin", [
  "KYC approvals",
  "business verification approvals",
  "sensitive action audit trails",
]);
