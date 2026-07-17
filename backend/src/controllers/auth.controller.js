import { authService } from '../services/auth.service.js'

export const authController = {
  register: async (req, res, next) => {
    try {
      const { name, email, password } = req.body
      const result = await authService.register({ name, email, password })
      res.status(201).json(result)
    } catch (error) {
      next(error)
    }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = req.body
      const result = await authService.login({ email, password })
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },

  getMe: async (req, res, next) => {
    try {
      const userId = req.user.id
      const user = await authService.getUserById(userId)
      res.status(200).json({ user })
    } catch (error) {
      next(error)
    }
  },
}
