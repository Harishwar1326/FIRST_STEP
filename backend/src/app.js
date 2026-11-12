import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import rootRouter from "./routes/index.js";

const app = express();

const configuredCorsOrigins = (process.env.CORS_ORIGINS || (process.env.NODE_ENV === 'production' ? '' : '*'))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (process.env.NODE_ENV === 'production' && configuredCorsOrigins.length === 0) {
  throw new Error('CORS_ORIGINS must list the trusted frontend origins in production.');
}

// Rate Limiting (relaxed in development — Smart Notes polling can be chatty)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 100 : 2000,
  message: {
    status: "error",
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/api/health" || req.path === "/health",
});

// Health check before rate limiter
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "FirstStep API Gateway is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api/", apiLimiter);

// Standard middlewares
app.use(helmet());
app.use(
  cors({
    origin: configuredCorsOrigins.includes("*") ? true : configuredCorsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-guest-id", "x-session-id"],
  }),
);

app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(morgan("dev"));

// Mount all modular routes (supports /api/v1 and /api)
app.use("/api/v1", rootRouter);
app.use("/api", rootRouter);

// Catch-all 404 Route
app.use((req, res, next) => {
  res.status(404).json({
    status: "error",
    message: `Cannot find ${req.originalUrl} on this server`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("💥 Global Error Handler caught an uncaught exception:", err);

  const statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : err.name === 'MulterError' ? 400 : err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export default app;
