import pg from "pg";

import { env } from "./env.js";

const { Pool } = pg;

if (!env.databaseUrl && env.nodeEnv !== "test") {
  throw new Error(
    "DATABASE_URL is required for PostgreSQL persistence. Add DATABASE_URL in backend .env",
  );
}

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.isProduction ? { rejectUnauthorized: false } : false,
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(callback) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
