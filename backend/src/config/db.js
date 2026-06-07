import pg from "pg";

import { env } from "./env.js";
import { logger } from "./logger.js";

const { Pool } = pg;
const afterCommitTasksSymbol = Symbol("goldwallah.afterCommitTasks");

// Shared PostgreSQL connection pool. Production SSL verifies the provider
// certificate; do not switch this back to rejectUnauthorized:false.
if (!env.databaseUrl && env.nodeEnv !== "test") {
  throw new Error(
    "DATABASE_URL is required for PostgreSQL persistence. Add DATABASE_URL in backend .env",
  );
}

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ...(env.pgSslCa
    ? {
        ssl: {
          ca: env.pgSslCa,
          rejectUnauthorized: false,
        },
      }
    : {}),
});

export function query(text, params) {
  return pool.query(text, params);
}

// Runs multiple database writes atomically. Throwing inside the callback rolls
// back every query made through the transaction client.
export async function withTransaction(callback) {
  const client = await pool.connect();
  const afterCommitTasks = [];

  try {
    client[afterCommitTasksSymbol] = afterCommitTasks;
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    await Promise.allSettled(
      afterCommitTasks.map(async (task) => {
        try {
          await task();
        } catch (error) {
          logger.warn({ error }, "Post-commit task failed");
        }
      }),
    );
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    delete client[afterCommitTasksSymbol];
    client.release();
  }
}

export function registerAfterCommit(client, task) {
  if (!client?.[afterCommitTasksSymbol]) {
    return false;
  }

  client[afterCommitTasksSymbol].push(task);
  return true;
}
