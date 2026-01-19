import { Request, Response } from 'express';
import { updateUserProfile, updateFCMToken } from '../services/auth.service';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { SUCCESS_MESSAGES } from '../utils/constants';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler.middleware';

/**
 * Get user profile
 * GET /api/v1/users/me
 */
export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;

  sendSuccess(res, 'Profile retrieved successfully', {
    user: {
      id: user._id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      avatar: user.avatar,
      salonId: user.salonId,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

/**
 * Update user profile
 * PUT /api/v1/users/me
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const updates = req.body;

    try {
      const user = await updateUserProfile(userId, updates);

      if (!user) {
        sendNotFound(res, 'User not found');
        return;
      }

      logger.info(`Profile updated successfully for user: ${userId}`);
      sendSuccess(res, SUCCESS_MESSAGES.PROFILE_UPDATED, {
        user: {
          id: user._id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.getFullName(),
          role: user.role,
          avatar: user.avatar,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error
        const field = Object.keys(error.keyPattern)[0];
        sendError(
          res,
          `${field} already exists`,
          'DUPLICATE_ENTRY',
          409
        );
        return;
      }
      throw error;
    }
  }
);

/**
 * Update FCM token
 * PUT /api/v1/users/fcm-token
 */
export const updateFCM = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { fcmToken } = req.body;

  await updateFCMToken(userId, fcmToken);

  logger.info(`FCM token updated for user: ${userId}`);
  sendSuccess(res, 'FCM token updated successfully');
});

/**
 * Delete user account (soft delete)
 * DELETE /api/v1/users/me
 */
export const deleteAccount = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;

    // Soft delete by setting isActive to false
    const user = await updateUserProfile(userId, { isActive: false } as any);

    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    logger.info(`Account deactivated for user: ${userId}`);
    sendSuccess(res, 'Account deactivated successfully');
  }
);

export default {
  getProfile,
  updateProfile,
  updateFCM,
  deleteAccount,
};
