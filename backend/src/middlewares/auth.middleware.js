import jwt from 'jsonwebtoken';
import { userSqlRepository } from '../repositories/user.repository.sql.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized to access this resource. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development_only_secret_key_123_456_789');
    
    const user = await userSqlRepository.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized to access this resource. User no longer exists.'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'student',
    };
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authorized to access this resource. Token is invalid or expired.'
    });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Admin privileges are required for this resource.'
    });
  }

  next();
};

// Export as authMiddleware for compatibility
export const authMiddleware = protect;
