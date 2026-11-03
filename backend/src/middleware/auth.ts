import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types/index.js';
import { TokenRevocationService } from '../services/tokenRevocationService.js';

interface JwtPayload {
  id: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
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

  const isProduction = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET;

  if (
    isProduction &&
    (!secret ||
      secret === 'habithero_development_jwt_secret_token_2026' ||
      secret === 'your_jwt_secret_key_change_in_production' ||
      secret.length < 16)
  ) {
    res.status(500).json({
      success: false,
      error: 'Server configuration error: Insecure or missing JWT_SECRET in production mode.',
    });
    return;
  }

  const effectiveSecret = secret || 'habithero_development_jwt_secret_token_2026';

  try {
    const decoded = jwt.verify(token, effectiveSecret) as JwtPayload;

    // Check if token was revoked due to a password change
    if (TokenRevocationService.isRevoked(decoded.id, decoded.iat)) {
      res.status(401).json({
        success: false,
        error: 'Session has been invalidated due to a password change. Please sign in again.',
      });
      return;
    }

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
