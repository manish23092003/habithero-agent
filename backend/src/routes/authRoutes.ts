import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { PasswordResetRateLimiter } from '../middleware/passwordResetRateLimiter.js';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/index.js';

const router = Router();

router.post('/register', validateRequest(registerSchema), AuthController.register);
router.post('/login', validateRequest(loginSchema), AuthController.login);
router.post('/google', validateRequest(googleAuthSchema), AuthController.googleAuth);
router.post(
  '/forgot-password',
  PasswordResetRateLimiter.forgotPasswordLimit,
  validateRequest(forgotPasswordSchema),
  AuthController.forgotPassword
);
router.post(
  '/reset-password',
  PasswordResetRateLimiter.resetPasswordLimit,
  validateRequest(resetPasswordSchema),
  AuthController.resetPassword
);
router.get('/me', authenticateToken, AuthController.getMe);
router.patch('/me', authenticateToken, validateRequest(updateProfileSchema), AuthController.updateMe);

export default router;
