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

export default {
  verifyFirebase,
  registerSalon,
  loginSalon,
  refreshToken,
  logoutUser,
  getCurrentUser,
};
