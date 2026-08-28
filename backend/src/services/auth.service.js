import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userSqlRepository } from "../repositories/user.repository.sql.js";
import { aiServiceClient } from "../utils/aiServiceClient.js";

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
    // Check if user already exists in PostgreSQL
    const existingUser = await userSqlRepository.findByEmail(email);
    if (existingUser) {
      throw new Error("User already exists");
    }

    // Create user in PostgreSQL (password hashing handled in repository)
    const user = await userSqlRepository.create({
      name,
      email,
      password,
      role: "student",
    });

    const token = signToken(user);

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
    // Find user in PostgreSQL
    const user = await userSqlRepository.findByEmail(email);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    const activeUser = await userSqlRepository.markActive(user.id);
    const token = signToken(activeUser || user);

    return {
      token,
      user: publicUser(activeUser || user),
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

    return userSqlRepository.ensureAdmin({ name, email, password });
  },
};
