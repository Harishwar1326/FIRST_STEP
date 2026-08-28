import pkg from "pg";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const { Pool } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URI,
  ssl: { rejectUnauthorized: false },
});

export const connectPostgres = async () => {
  let client;

  try {
    client = await pool.connect();
    const userSchema = readFileSync(
      join(__dirname, "../models/user.sql"),
      "utf8",
    );

    await client.query(userSchema);
    console.log("PostgreSQL (Neon) connected successfully");
  } catch (error) {
    console.error("PostgreSQL connection failed:", error.message);
    // Don't throw, just warn
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
