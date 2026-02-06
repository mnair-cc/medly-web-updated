import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const { Pool } = pg;

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log("DATABASE_URL not set, skipping migrations");
    process.exit(0);
  }

  console.log("Running database migrations...");

  const isLocalhost =
    databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, // 10s timeout to connect
    idleTimeoutMillis: 30000,
  });

  try {
    // Test connection before running migrations
    const client = await pool.connect();
    client.release();
    console.log("Database connection established");

    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error.message || error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error("Unexpected error:", error.message || error);
  process.exit(1);
});
