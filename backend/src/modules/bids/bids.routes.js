import { createModuleStatusRouter } from "../../utils/moduleStatusRouter.js";

export const bidsRouter = createModuleStatusRouter("bids", [
  "private jeweller bids",
  "seller-only bid visibility",
  "audit logging",
]);
