import dotenv from "dotenv";
import app from "./src/app.js";
import { connectDB } from "./src/config/database.js";
import { connectPostgres } from "./src/config/postgres.js";
import { createClient } from "redis";

dotenv.config();

const PORT = process.env.PORT || 5000;
const REDIS_URL = process.env.REDIS_URL;

// Initialize Redis client
let redisClient;
const connectRedis = async () => {
  if (!REDIS_URL) {
    console.warn("⚠️  No REDIS_URL provided. Running without cache.");
    return;
  }
  try {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on("error", (err) => console.log("❌ Redis Client Error", err));
    await redisClient.connect();
    console.log("⚡ Redis cache connected successfully");
  } catch (error) {
    console.warn(
      "⚠️  Redis connection failed. Running without cache.",
      error.message,
    );
  }
};

const startServer = async () => {
  // Connect to MongoDB for other data (make it non-blocking)
  try {
    await connectDB();
  } catch (error) {
    console.warn(
      "⚠️  MongoDB connection failed. Some features may not work.",
      error.message,
    );
  }

  // Connect to PostgreSQL (Neon) for user authentication (non-blocking)
  try {
    await connectPostgres();
  } catch (error) {
    console.warn(
      "⚠️  PostgreSQL connection failed. Some features may not work.",
      error.message,
    );
  }

  // Connect to Redis for caching (already non-blocking)
  await connectRedis();

  app.listen(PORT, () => {
    console.log(
      `🚀 API Gateway running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`,
    );
  });
};

startServer();

export { redisClient };
