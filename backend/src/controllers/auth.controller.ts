import { Request, Response } from 'express';
import { verifyFirebaseToken } from '../config/firebase';
import {
  registerCustomer,
  registerSalonAdmin,
  loginSalonAdmin,
  refreshAccessToken,
  logout,
} from '../services/auth.service';
import { sendSuccess, sendError, sendUnauthorized } from '../utils/response';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler.middleware';

/**
 * Verify Firebase ID token and login/register customer
 * POST /api/v1/auth/verify-firebase
 */
export const verifyFirebase = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { idToken, fcmToken, firstName, lastName } = req.body;

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseToken(idToken);
    } catch (error) {
      sendUnauthorized(res, 'Invalid Firebase ID token');
      return;
    }

    const phone = decodedToken.phone_number;

    if (!phone) {
      sendError(res, 'Phone number not found in Firebase token', 'INVALID_TOKEN', 400);
      return;
    }

    // Register/login customer
    const { user, tokens } = await registerCustomer(phone, fcmToken, firstName, lastName);

    logger.info(`Customer logged in successfully: ${user._id}`);
    sendSuccess(
      res,
      SUCCESS_MESSAGES.LOGIN_SUCCESS,
      {
        user: {
          id: user._id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
          isPhoneVerified: user.isPhoneVerified,
        },
        tokens,
      },
      200
    );
  }
);

/**
 * Register salon admin
 * POST /api/v1/auth/salon/register
 */
export const registerSalon = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, firstName, lastName, phone } = req.body;

    try {
      const { user, tokens } = await registerSalonAdmin({
        email,
        password,
        firstName,
        lastName,
        phone,
      });

      logger.info(`Salon admin registered successfully: ${user._id}`);
      sendSuccess(
        res,
        'Salon admin registered successfully',
        {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
          },
          tokens,
        },
        201
      );
    } catch (error: any) {
      if (
        error.message === ERROR_MESSAGES.DUPLICATE_EMAIL ||
        error.message === ERROR_MESSAGES.DUPLICATE_PHONE
      ) {
        sendError(res, error.message, 'DUPLICATE_ENTRY', 409);
        return;
      }
      throw error;
    }
  }
);

/**
 * Login salon admin
 * POST /api/v1/auth/salon/login
 */
export const loginSalon = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const { user, tokens } = await loginSalonAdmin(email, password);

    logger.info(`Salon admin logged in successfully: ${user._id}`);
    sendSuccess(res, SUCCESS_MESSAGES.LOGIN_SUCCESS, {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        salonId: user.salonId,
        isEmailVerified: user.isEmailVerified,
      },
      tokens,
    });
  } catch (error: any) {
    if (error.message === ERROR_MESSAGES.INVALID_CREDENTIALS) {
      sendUnauthorized(res, ERROR_MESSAGES.INVALID_CREDENTIALS);
      return;
    }
    throw error;
  }
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh-token
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { refreshToken: token } = req.body;

    try {
      const tokens = await refreshAccessToken(token);

      logger.info('Access token refreshed successfully');
      sendSuccess(res, 'Token refreshed successfully', { tokens });
    } catch (error: any) {
      if (
        error.message === ERROR_MESSAGES.INVALID_TOKEN ||
        error.message.includes('expired')
      ) {
        sendUnauthorized(res, error.message);
        return;
      }
      throw error;
    }
  }
);

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logoutUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { refreshToken } = req.body;

  await logout(userId, refreshToken);

  logger.info(`User logged out successfully: ${userId}`);
  sendSuccess(res, SUCCESS_MESSAGES.LOGOUT_SUCCESS);
});

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;

    sendSuccess(res, 'User profile retrieved successfully', {
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
      },
    });
  }
);

/**
 * Update current user profile
 * PATCH /api/v1/auth/profile
 */
export const updateProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!._id;
    const { firstName, lastName, fcmToken } = req.body;
    const updates: Record<string, string> = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (fcmToken) updates.fcmToken = fcmToken;
    const user = await (await import('../models/User')).User.findByIdAndUpdate(
      userId, updates, { new: true }
    );
    sendSuccess(res, 'Profile updated', { user });
  }
);

/**
 * Dev-only: login/register by phone number (skips Firebase OTP)
 * POST /api/v1/auth/dev-phone
 */
export const devPhoneLogin = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!__DEV_MODE__) {
      res.status(403).json({ success: false, message: 'Not available in production' });
      return;
    }
    const { phone, role } = req.body;
    if (!phone) { res.status(400).json({ success: false, message: 'phone required' }); return; }
    const roleMap: Record<string, string> = { owner: 'salon_admin', customer: 'customer' };
    const mappedRole = roleMap[role] ?? 'customer';
    // Super admin cannot be created via dev-phone — must use email/password login.
    if (mappedRole !== 'salon_admin' && mappedRole !== 'customer') {
      res.status(403).json({ success: false, message: 'Invalid role for dev login' });
      return;
    }
    const { registerCustomer } = await import('../services/auth.service');
    const bcrypt = await import('bcryptjs');
    const { user, tokens } = await registerCustomer(phone, undefined, 'Dev', 'User');
    // Update role if needed — salon_admin requires email + password
    if (user.role !== mappedRole) {
      user.role = mappedRole as any;
      if (mappedRole === 'salon_admin') {
        if (!user.email) user.email = `dev-${phone}@trimcity.local`;
        if (!user.password) user.password = await bcrypt.hash('DevPassword@1234', 12);
      }
      await user.save();
    }
    sendSuccess(res, 'Dev login successful', { user, tokens });
  }
);

const __DEV_MODE__ = process.env.NODE_ENV !== 'production';

export default {
  verifyFirebase,
  registerSalon,
  loginSalon,
  refreshToken,
  logoutUser,
  getCurrentUser,
  updateProfile,
  devPhoneLogin,
};
