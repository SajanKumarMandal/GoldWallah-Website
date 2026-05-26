import { createModuleStatusRouter } from "../../utils/moduleStatusRouter.js";

export const usersRouter = createModuleStatusRouter("users", [
  "seller profiles",
  "jeweller profiles",
  "admin users",
]);
