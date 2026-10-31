import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types/index.js';

interface JwtPayload {
  id: string;
  email: string;
  name: string;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a Bearer token.',
    });
    return;
  }

  const secret = process.env.JWT_SECRET || 'habithero_development_jwt_secret_token_2026';

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

