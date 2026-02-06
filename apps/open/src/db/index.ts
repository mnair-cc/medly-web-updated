import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { databaseUrl, sslConfig } from "./db-config";
import * as relations from "./migrations/relations";
import * as schema from "./migrations/schema";

// Type for our schema
type SchemaType = typeof schema & typeof relations;

// Global singleton to survive HMR in development and prevent connection leaks.
// In production, this is just a regular module-level variable.
const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
  db: NodePgDatabase<SchemaType> | undefined;
};

function createPool(): Pool {
  return new Pool({
    connectionString: databaseUrl,
    ssl: sslConfig,
    // Connection pool configuration
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 15000, // Close idle clients after 15 seconds
    connectionTimeoutMillis: 5000, // Fail after 5 seconds if connection can't be established
  });
}

// Reuse existing pool or create new one
export const pool = globalForDb.pool ?? createPool();

// Reuse existing db instance or create new one
export const db =
  globalForDb.db ??
  drizzle(pool, {
    schema: {
      ...schema,
      ...relations,
    },
  });

// Cache in globalThis for development HMR
if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
  globalForDb.db = db;
}

// Export schema for direct imports
export * from "./migrations/relations";
export * from "./migrations/schema";
export * from "./types";
