import { Router } from 'express';
import {
  sendOTP,
  verifyOTPAndLogin,
  registerSalon,
  loginSalon,
  refreshToken,
  logoutUser,
  getCurrentUser,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import {
  sendOTPSchema,
  verifyOTPSchema,
  salonRegisterSchema,
  salonLoginSchema,
  refreshTokenSchema,
} from '../utils/validators';
import { otpLimiter, authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

/**
 * Customer Authentication Routes
 */

// Send OTP to customer's phone via FCM
router.post('/send-otp', otpLimiter, validateBody(sendOTPSchema), sendOTP);

// Verify OTP and login/register customer
router.post(
  '/verify-otp',
  authLimiter,
  validateBody(verifyOTPSchema),
  verifyOTPAndLogin
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

export default router;
