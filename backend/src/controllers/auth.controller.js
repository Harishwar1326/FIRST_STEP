import { authService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/errorHandler.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    res.status(201).json({
      status: 'success',
      data: result,
      message: 'User registered successfully'
    });
  }),

  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Login successful'
    });
  }),

  getMe: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const user = await authService.getUserById(userId);
    res.status(200).json({
      status: 'success',
      data: { user },
      message: 'User profile retrieved'
    });
  }),
};
