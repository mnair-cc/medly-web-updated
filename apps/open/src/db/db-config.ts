/**
 * Runtime database configuration.
 * Separated from drizzle.config.ts to avoid module-load-time crashes
 * when DATABASE_URL is not set (drizzle-kit config evaluates parseDbCredentials immediately).
 */

export const databaseUrl = process.env.DATABASE_URL;

const isLocalhost =
  databaseUrl?.includes("localhost") || databaseUrl?.includes("127.0.0.1");

/**
 * SSL config for node-postgres Pool (runtime).
 * Uses { rejectUnauthorized: false } to accept Heroku's self-signed certificates.
 */
export const sslConfig = isLocalhost ? false : { rejectUnauthorized: false };
