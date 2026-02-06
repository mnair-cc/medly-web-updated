import { defineConfig } from "drizzle-kit";

/**
 * Drizzle-kit configuration for migrations and schema generation.
 * This file is only loaded by the drizzle-kit CLI, not at runtime.
 *
 * Runtime database config (databaseUrl, sslConfig) is in db-config.ts
 * to avoid module-load-time crashes when DATABASE_URL is unset.
 */

const databaseUrl = process.env.DATABASE_URL;

const isLocalhost =
  databaseUrl?.includes("localhost") || databaseUrl?.includes("127.0.0.1");

/**
 * Parse DATABASE_URL into individual credentials for drizzle-kit.
 * drizzle-kit only supports ssl option with individual params, not with url.
 */
function parseDbCredentials(url: string | undefined) {
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is required for drizzle-kit commands",
    );
  }
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 5432,
    user: parsed.username,
    // Only include password if present (local dev often uses peer auth with no password)
    ...(parsed.password && { password: parsed.password }),
    database: parsed.pathname.slice(1), // remove leading "/"
    ssl: !isLocalhost,
  };
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/migrations/*.ts",
  out: "./src/db/migrations",
  tablesFilter: "open_platform_*",
  dbCredentials: parseDbCredentials(databaseUrl),
});
