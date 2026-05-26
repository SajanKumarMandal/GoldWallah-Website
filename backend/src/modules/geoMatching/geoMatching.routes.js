import { createModuleStatusRouter } from "../../utils/moduleStatusRouter.js";

export const geoMatchingRouter = createModuleStatusRouter("geo-matching", [
  "PostGIS radius matching",
  "nearest fallback",
  "indexed location lookups",
]);
