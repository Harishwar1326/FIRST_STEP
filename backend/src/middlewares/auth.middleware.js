import jwt from "jsonwebtoken";
import { userSqlRepository } from "../repositories/user.repository.sql.js";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return process.env.JWT_SECRET;
};

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Not authorized to access this resource. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    let user;
    try {
      user = await userSqlRepository.findById(decoded.id);
    } catch (dbError) {
      console.warn("⚠️ Postgres connection issue in auth middleware:", dbError.message);
    }

    if (!user) {
      if (process.env.NODE_ENV !== "production" && decoded.id) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name || "Student",
          role: decoded.role || "student",
        };
        return next();
      }

      return res.status(401).json({
        status: "error",
        message:
          "Not authorized to access this resource. User no longer exists.",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "student",
    };
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message:
        "Not authorized to access this resource. Token is invalid or expired.",
    });
  }
};

// Populate an authenticated user when a token is present while allowing the
// explicitly guest-capable routes to continue without a token.
export const optionalAuthMiddleware = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) return next();
  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "error",
      message: "Authorization header must use a Bearer token.",
    });
  }

  try {
    const decoded = jwt.verify(authorization.slice(7), getJwtSecret());
    let user;
    try {
      user = await userSqlRepository.findById(decoded.id);
    } catch (dbError) {
      console.warn("Postgres connection issue in optional auth middleware:", dbError.message);
    }

    if (!user && process.env.NODE_ENV !== "production" && decoded.id) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name || "Student",
        role: decoded.role || "student",
      };
      return next();
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Not authorized to access this resource. User no longer exists.",
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "student",
    };
    return next();
  } catch (_error) {
    return res.status(401).json({
      status: "error",
      message: "Not authorized to access this resource. Token is invalid or expired.",
    });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      status: "error",
      message: "Admin privileges are required for this resource.",
    });
  }

  next();
};

// Export as authMiddleware for compatibility
export const authMiddleware = protect;
