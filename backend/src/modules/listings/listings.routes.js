import { createModuleStatusRouter } from "../../utils/moduleStatusRouter.js";

export const listingsRouter = createModuleStatusRouter("listings", [
  "seller gold listings",
  "KYC-gated creation",
  "cursor pagination",
]);
