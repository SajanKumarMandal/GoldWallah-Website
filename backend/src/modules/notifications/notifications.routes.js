import { createModuleStatusRouter } from "../../utils/moduleStatusRouter.js";

export const notificationsRouter = createModuleStatusRouter("notifications", [
  "durable notification records",
  "real-time push later",
  "no bid amount leakage",
]);
