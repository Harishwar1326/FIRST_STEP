import express from "express";
import cors from "cors";
import morgan from "morgan";
import rootRouter from "./routes/index.js";

const app = express();

const corsOrigins = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Standard middlewares
app.use(
  cors({
    origin: corsOrigins.includes("*") ? true : corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(morgan("dev"));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "FirstStep API Gateway is healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

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

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export default app;
