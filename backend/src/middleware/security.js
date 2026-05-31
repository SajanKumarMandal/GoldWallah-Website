import cors from "cors";
import helmet from "helmet";

import { env } from "../config/env.js";

export const securityMiddleware = [
  helmet(),
  cors({
    origin: env.frontendOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  }),
];
