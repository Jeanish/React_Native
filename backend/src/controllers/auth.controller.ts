import { Request, Response } from 'express';
import { createOTP, verifyOTP } from '../services/otp.service';
import { sendOTPNotification } from '../services/fcm.service';
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
 * Send OTP to customer's phone via FCM
 * POST /api/v1/auth/send-otp
 */
export const sendOTP = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { phone, fcmToken } = req.body;

  // Generate and store OTP
  const otp = await createOTP(phone);

  // Send OTP via FCM push notification
  const result = await sendOTPNotification(fcmToken, otp, phone);

  if (!result.success) {
    logger.error(`Failed to send OTP to ${phone}:`, result.error);
    sendError(
      res,
      'Failed to send OTP. Please check your FCM token and try again',
      'OTP_SEND_FAILED',
      500
    );
    return;
  }

  logger.info(`OTP sent successfully to ${phone}`);
  sendSuccess(res, SUCCESS_MESSAGES.OTP_SENT, {
    phone,
    expiresIn: '10 minutes',
  });
});

/**
 * Verify OTP and login/register customer
 * POST /api/v1/auth/verify-otp
 */
export const verifyOTPAndLogin = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { phone, otp, fcmToken } = req.body;

    // Verify OTP
    const verification = await verifyOTP(phone, otp);

    if (!verification.isValid) {
      sendError(res, verification.message, 'OTP_VERIFICATION_FAILED', 400);
      return;
    }

    // Register/login customer
    const { user, tokens } = await registerCustomer(phone, fcmToken);

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
  sendOTP,
  verifyOTPAndLogin,
  registerSalon,
  loginSalon,
  refreshToken,
  logoutUser,
  getCurrentUser,
};
