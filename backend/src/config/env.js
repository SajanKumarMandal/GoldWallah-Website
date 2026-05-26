import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default("http://localhost:5173"),
  API_VERSION: z.string().min(1).default("v1"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid backend environment configuration");
  console.error(parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  frontendOrigin: parsedEnv.data.FRONTEND_ORIGIN,
  apiVersion: parsedEnv.data.API_VERSION,
  isProduction: parsedEnv.data.NODE_ENV === "production",
};
