import pkg from "pg";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dns from "dns";

// Force IPv4 resolution first to prevent ENETUNREACH IPv6 delays on Windows
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
} catch (e) {
  // Ignore fallback
}

const { Pool } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const normalizeConnectionString = (value) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  const match = trimmed.match(/postgres(?:ql)?:\/\/[^\s'"]+/);
  return match ? match[0] : trimmed;
};

const connectionString = normalizeConnectionString(
  process.env.DATABASE_URL || process.env.POSTGRES_URI,
);

const shouldUseSsl =
  connectionString &&
  (connectionString.includes("sslmode=require") ||
    connectionString.includes("neon.tech") ||
    process.env.NODE_ENV === "production");

const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
});

// Suppress unhandled idle client errors on serverless database wake-ups
pool.on("error", (err) => {
  console.warn("⚠️  PostgreSQL pool client warning/reset:", err.message);
});

/**
 * Execute PostgreSQL query with automatic retry for serverless cold starts (Neon / cloud PG).
 */
export const query = async (text, params, retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      const errStr = String(err) + " " + (err.message || "") + " " + (err.name || "") + " " + (err.code || "");
      const isTransient =
        err.code === "ECONNRESET" ||
        err.code === "ETIMEDOUT" ||
        err.code === "ECONNREFUSED" ||
        err.code === "ENETUNREACH" ||
        err.code === "57P01" ||
        err.code === "08006" ||
        err.code === "08003" ||
        err.name === "AggregateError" ||
        errStr.includes("ETIMEDOUT") ||
        errStr.includes("ENETUNREACH") ||
        errStr.includes("timeout") ||
        errStr.includes("Connection terminated") ||
        errStr.includes("closed");

      if (isTransient && attempt < retries) {
        console.warn(`⚠️ PostgreSQL query cold-start retry (${attempt}/${retries}). Waiting for database wake-up...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      // If connection times out after retries, attach user-friendly 503 status code
      if (isTransient) {
        err.statusCode = 503;
        err.message = "Database connection timed out during wake-up. Please try again in a moment.";
      }
      throw err;
    }
  }
};

export const connectPostgres = async () => {
  let client;
  try {
    client = await pool.connect();
    const userSchema = readFileSync(
      join(__dirname, "../models/user.sql"),
      "utf8",
    );
    await client.query(userSchema);
    console.log("⚡ PostgreSQL connected successfully");
  } catch (error) {
    console.error("⚠️ PostgreSQL connection warning:", error.message);
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const disconnectPostgres = async () => {
  await pool.end();
  console.log("PostgreSQL connection closed");
};

export default pool;
