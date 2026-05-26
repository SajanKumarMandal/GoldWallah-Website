import { createModuleStatusRouter } from "../../utils/moduleStatusRouter.js";

export const auditLogsRouter = createModuleStatusRouter("audit-logs", [
  "admin actions",
  "KYC actions",
  "listing and bid actions",
]);
