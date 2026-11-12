import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userSqlRepository } from "../repositories/user.repository.sql.js";
import { aiServiceClient } from "../utils/aiServiceClient.js";
import { activityService } from "./activity.service.js";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return process.env.JWT_SECRET;
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role || "student",
  level: user.level || "beginner",
  points: user.points || 0,
  createdAt: user.created_at,
  lastActiveAt: user.last_active_at,
});

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role || "student" },
    getJwtSecret(),
    { expiresIn: "7d" },
  );

export const authService = {
  async register({ name, email, password }) {
    name = name.trim();
    email = email.trim().toLowerCase();
    // Check if user already exists in PostgreSQL
    const existingUser = await userSqlRepository.findByEmail(email);
    if (existingUser) {
      const error = new Error("User already exists with this email address");
      error.statusCode = 400;
      throw error;
    }

    // Create user in PostgreSQL (password hashing handled in repository)
    let user;
    try {
      user = await userSqlRepository.create({ name, email, password, role: "student" });
    } catch (error) {
      if (error.code === '23505') {
        const duplicateError = new Error("User already exists with this email address");
        duplicateError.statusCode = 409;
        throw duplicateError;
      }
      throw error;
    }

    const token = signToken(user);

    // Record activity event and create Admin notification synchronously before returning response
    try {
      await activityService.recordActivityAndNotifyAdmin({
        type: "register",
        user,
        action: "Created a new student account",
      });
    } catch (err) {
      console.error("Activity logging error:", err);
    }

    // Initialize Learning Twin in AI service
    try {
      await aiServiceClient.post("/twin/initialize", {
        userId: user.id,
        name: user.name,
      });
    } catch (error) {
      console.error("Failed to initialize Learning Twin:", error);
    }

    return {
      token,
      user: publicUser(user),
    };
  },

  async login({ email, password }) {
    email = email.trim().toLowerCase();
    // Find user in PostgreSQL
    const user = await userSqlRepository.findByEmail(email);
    if (!user) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      const error = new Error("Invalid email or password");
      error.statusCode = 401;
      throw error;
    }

    const activeUser = await userSqlRepository.markActive(user.id);
    const finalUser = activeUser || user;

    // Record activity event and create Admin notification synchronously before returning response
    try {
      await activityService.recordActivityAndNotifyAdmin({
        type: "login",
        user: finalUser,
        action: `${finalUser.role === 'admin' ? 'Admin' : 'Student'} logged into FirstStep platform`,
      });
    } catch (err) {
      console.error("Activity logging error:", err);
    }

    const token = signToken(finalUser);

    return {
      token,
      user: publicUser(finalUser),
    };
  },

  async getUserById(userId) {
    const user = await userSqlRepository.markActive(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return publicUser(user);
  },

  async ensureConfiguredAdmin() {
    const {
      ADMIN_EMAIL: email,
      ADMIN_PASSWORD: password,
      ADMIN_NAME: name,
    } = process.env;

    if (!email || !password || !name) {
      console.warn(
        "Admin user not created: ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME are required.",
      );
      return null;
    }

    const admin = await userSqlRepository.ensureAdmin({ name, email, password });
    if (!admin) {
      console.warn('Configured admin email already belongs to a non-admin account; no account was changed.');
    }
    return admin;
  },
};
