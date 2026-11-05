import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { User } from '../models/User.js';

/**
 * Parses and returns the list of normalized, lowercase administrator emails from environment.
 * Returns an empty array if ADMIN_EMAILS is missing or empty (failing closed).
 */
export const getAdminEmails = (): string[] => {
  const envEmails = process.env.ADMIN_EMAILS;
  if (!envEmails || typeof envEmails !== 'string' || !envEmails.trim()) {
    return [];
  }
  return envEmails
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
};

/**
 * Express middleware that restricts access strictly to authorized administrators.
 * 1. Checks that the request has been authenticated via authenticateToken (returns 401 if not).
 * 2. Fails closed (403) if ADMIN_EMAILS configuration is absent or empty.
 * 3. Verifies the authenticated user's identity against the database using trusted authentication flow.
 * 4. Fails closed (403) unless the account was verified and authenticated via Google OAuth (authProvider === 'google').
 *    Password-based/local accounts cannot access admin routes, preventing unverified email claiming attacks.
 * 5. Checks the verified user's email against the normalized ADMIN_EMAILS allowlist (case-insensitively).
 * 6. Rejects unauthorized accounts with 403 (code: 'ADMIN_ACCESS_REQUIRED').
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a Bearer token.',
    });
    return;
  }

  // 1. Fail closed if admin allowlist is not configured or empty
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) {
    res.status(403).json({
      success: false,
      code: 'ADMIN_ACCESS_REQUIRED',
      error: 'Administrator access is not configured on this server.',
    });
    return;
  }

  try {
    // 2. Verify authenticated user's existence and get official identity from MongoDB
    const user = await User.findById(userId).select('email authProvider').lean();
    if (!user || !user.email) {
      res.status(403).json({
        success: false,
        code: 'ADMIN_ACCESS_REQUIRED',
        error: 'Access denied: user account not found.',
      });
      return;
    }

    // 3. Require verified identity via Google OAuth (authProvider === 'google')
    // Password-based accounts do not undergo email ownership verification, so they are strictly prohibited
    if (user.authProvider !== 'google') {
      res.status(403).json({
        success: false,
        code: 'ADMIN_ACCESS_REQUIRED',
        error: 'Access denied: administrator access requires a verified Google-authenticated account.',
      });
      return;
    }

    // 4. Compare verified account email against normalized allowlist (case-insensitive)
    const normalizedEmail = user.email.trim().toLowerCase();
    const isAuthorized = adminEmails.includes(normalizedEmail);

    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        code: 'ADMIN_ACCESS_REQUIRED',
        error: 'Access denied: administrator privileges required.',
      });
      return;
    }

    next();
  } catch (err: any) {
    console.error('[requireAdmin] Error verifying administrator authorization:', err);
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred while verifying administrator privileges.',
    });
  }
};

