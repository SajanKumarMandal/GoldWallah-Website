import { createModuleStatusRouter } from "../../utils/moduleStatusRouter.js";

export const mediaRouter = createModuleStatusRouter("media", [
  "validated uploads",
  "object storage",
  "signed private document URLs",
]);
