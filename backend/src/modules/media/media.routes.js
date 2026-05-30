import { Router } from "express";

import * as mediaController from "./media.controller.js";

export const mediaRouter = Router();

mediaRouter.get("/", (_request, response) => {
  response.status(200).json({
    module: "media",
    status: "ready",
    capabilities: [
      "validated uploads",
      "public listing images",
      "signed private document URLs",
    ],
  });
});

mediaRouter.get("/private/:scope/:filename", mediaController.privateMedia);
