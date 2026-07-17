import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { userSqlRepository } from '../repositories/user.repository.sql.js'
import { aiServiceClient } from '../utils/aiServiceClient.js'

export const authService = {
  async register({ name, email, password }) {
    // Check if user already exists in PostgreSQL
    const existingUser = await userSqlRepository.findByEmail(email)
    if (existingUser) {
      throw new Error('User already exists')
    }

    // Create user in PostgreSQL (password hashing handled in repository)
    const user = await userSqlRepository.create({ name, email, password })

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'development_only_secret_key_123_456_789',
      { expiresIn: '7d' }
    )

    // Initialize Learning Twin in AI service
    try {
      await aiServiceClient.post('/twin/initialize', {
        userId: user.id,
        name: user.name,
      })
    } catch (error) {
      console.error('Failed to initialize Learning Twin:', error)
    }

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        level: user.level || 'beginner',
        points: user.points || 0,
      },
    }
  },

  async login({ email, password }) {
    // Find user in PostgreSQL
    const user = await userSqlRepository.findByEmail(email)
    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      throw new Error('Invalid credentials')
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'development_only_secret_key_123_456_789',
      { expiresIn: '7d' }
    )

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        level: user.level || 'beginner',
        points: user.points || 0,
      },
    }
  },

  async getUserById(userId) {
    const user = await userSqlRepository.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      level: user.level || 'beginner',
      points: user.points || 0,
      createdAt: user.created_at,
    }
  },
}
