import { Router } from "express";

export function createModuleStatusRouter(moduleName, capabilities = []) {
  const router = Router();

  router.get("/", (_request, response) => {
    response.status(200).json({
      module: moduleName,
      status: "planned",
      capabilities,
    });
  });

  return router;
}
