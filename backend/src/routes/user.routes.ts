import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateFCM,
  deleteAccount,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import {
  updateProfileSchema,
  updateFCMTokenSchema,
} from '../utils/validators';

const router = Router();

// All user routes require authentication
router.use(authenticate);

/**
 * User Profile Routes
 */

// Get current user profile
router.get('/me', getProfile);

// Update user profile
router.put('/me', validateBody(updateProfileSchema), updateProfile);

// Update FCM token
router.put('/fcm-token', validateBody(updateFCMTokenSchema), updateFCM);

// Delete user account (soft delete)
router.delete('/me', deleteAccount);

export default router;
