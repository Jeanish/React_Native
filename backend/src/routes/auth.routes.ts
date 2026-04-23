import { Router } from 'express';
import {
  verifyFirebase,
  registerSalon,
  loginSalon,
  refreshToken,
  logoutUser,
  getCurrentUser,
  updateProfile,
  devPhoneLogin,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import {
  verifyFirebaseSchema,
  salonRegisterSchema,
  salonLoginSchema,
  refreshTokenSchema,
} from '../utils/validators';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

/**
 * Customer Authentication Routes
 */

// Verify Firebase ID token and login/register customer
router.post(
  '/verify-firebase',
  authLimiter,
  validateBody(verifyFirebaseSchema),
  verifyFirebase
);

/**
 * Salon Admin Authentication Routes
 */

// Register salon admin
router.post(
  '/salon/register',
  authLimiter,
  validateBody(salonRegisterSchema),
  registerSalon
);

// Login salon admin
router.post(
  '/salon/login',
  authLimiter,
  validateBody(salonLoginSchema),
  loginSalon
);

/**
 * Token Management Routes
 */

// Refresh access token
router.post('/refresh-token', validateBody(refreshTokenSchema), refreshToken);

// Logout user
router.post('/logout', authenticate, logoutUser);

/**
 * User Profile Routes
 */

// Get current user profile
router.get('/me', authenticate, getCurrentUser);

// Update profile (name, fcmToken)
router.patch('/profile', authenticate, updateProfile);

// Dev-only: bypass Firebase OTP
router.post('/dev-phone', devPhoneLogin);

export default router;
