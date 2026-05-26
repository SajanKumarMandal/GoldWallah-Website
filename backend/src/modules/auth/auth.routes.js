import { createModuleStatusRouter } from "../../utils/moduleStatusRouter.js";

export const authRouter = createModuleStatusRouter("auth", [
  "JWT access tokens",
  "refresh token rotation",
  "role-aware sessions",
]);
