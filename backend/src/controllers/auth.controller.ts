import { Request, Response } from 'express';
import { verifyFirebaseToken } from '../config/firebase';
import {
  registerCustomer,
  registerCustomerByEmail,
  registerSalonAdmin,
  loginSalonAdmin,
  refreshAccessToken,
  logout,
} from '../services/auth.service';
import { createOTP, verifyOTP as verifyOtpService } from '../services/otp.service';
import { sendOtpEmail } from '../services/email.service';
import { sendSuccess, sendError, sendUnauthorized } from '../utils/response';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler.middleware';
import { isTempEmail } from '../utils/tempMailBlocker';

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

    const email = decodedToken.email;
    const phone = decodedToken.phone_number;

    if (!email && !phone) {
      sendError(res, 'Email or phone number not found in Firebase token', 'INVALID_TOKEN', 400);
      return;
    }

    let user, tokens;
    if (email) {
      if (isTempEmail(email)) {
        sendError(res, 'Temporary or disposable email addresses are not allowed', 'TEMP_EMAIL_BLOCKED', 400);
        return;
      }
      const displayName = decodedToken.name || '';
      const parts = displayName.split(' ');
      const tokenFirstName = parts[0] || '';
      const tokenLastName = parts.slice(1).join(' ') || '';

      const regResult = await registerCustomerByEmail(
        email,
        fcmToken,
        firstName || tokenFirstName,
        lastName || tokenLastName
      );
      user = regResult.user;
      tokens = regResult.tokens;
    } else {
      const regResult = await registerCustomer(phone!, fcmToken, firstName, lastName);
      user = regResult.user;
      tokens = regResult.tokens;
    }

    logger.info(`Customer logged in successfully: ${user._id}`);
    sendSuccess(
      res,
      SUCCESS_MESSAGES.LOGIN_SUCCESS,
      {
        user: {
          id: user._id,
          phone: user.phone,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
          isPhoneVerified: user.isPhoneVerified,
          isEmailVerified: user.isEmailVerified,
        },
        tokens,
      },
      200
    );
  }
);

/**
 * Send OTP to email address
 * POST /api/v1/auth/send-otp
 */
export const sendOtp = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    // Additional backend validation to prevent temp email spam bypassing validation middleware
    if (isTempEmail(email)) {
      sendError(res, 'Temporary or disposable email addresses are not allowed', 'TEMP_EMAIL_BLOCKED', 400);
      return;
    }

    const otpCode = await createOTP(email);
    await sendOtpEmail(email, otpCode);

    logger.info(`OTP sent to email: ${email}`);
    sendSuccess(res, 'OTP sent successfully', { email });
  }
);

/**
 * Verify OTP and login/register user
 * POST /api/v1/auth/verify-otp
 */
export const verifyOtp = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, otp, fcmToken } = req.body;

    const verification = await verifyOtpService(email, otp);
    if (!verification.isValid) {
      sendError(res, verification.message, 'INVALID_OTP', 400);
      return;
    }

    const { user, tokens } = await registerCustomerByEmail(email, fcmToken);

    logger.info(`User verified via OTP: ${user._id}`);
    sendSuccess(
      res,
      SUCCESS_MESSAGES.LOGIN_SUCCESS,
      {
        user: {
          id: user._id,
          phone: user.phone,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
          isPhoneVerified: user.isPhoneVerified,
          isEmailVerified: user.isEmailVerified,
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
    const set: Record<string, unknown> = {};
    const unset: Record<string, 1> = {};
    if (firstName) set.firstName = firstName;
    if (lastName) set.lastName = lastName;
    // fcmToken: string sets it; explicit null/'' unsets it (called on logout).
    if (fcmToken === null || fcmToken === '') unset.fcmToken = 1;
    else if (typeof fcmToken === 'string') set.fcmToken = fcmToken;
    const update: any = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    const user = await (await import('../models/User')).User.findByIdAndUpdate(
      userId, update, { new: true }
    );
    sendSuccess(res, 'Profile updated', { user });
  }
);

/**
 * Dev-only: login/register by email or phone number (skips Firebase OTP)
 * POST /api/v1/auth/dev-phone
 */
export const devPhoneLogin = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!__DEV_MODE__) {
      res.status(403).json({ success: false, message: 'Not available in production' });
      return;
    }
    const { phone, email, role } = req.body;
    if (!phone && !email) { res.status(400).json({ success: false, message: 'phone or email required' }); return; }
    const roleMap: Record<string, string> = { owner: 'salon_admin', customer: 'customer' };
    const mappedRole = roleMap[role] ?? 'customer';
    // Super admin cannot be created via dev-phone/dev-email — must use email/password login.
    if (mappedRole !== 'salon_admin' && mappedRole !== 'customer') {
      res.status(403).json({ success: false, message: 'Invalid role for dev login' });
      return;
    }
    
    const { registerCustomer, registerCustomerByEmail, issueTokensForUser } = await import('../services/auth.service');
    
    let result;
    if (email) {
      result = await registerCustomerByEmail(email, undefined, 'Dev', 'User');
    } else {
      result = await registerCustomer(phone!, undefined, 'Dev', 'User');
    }
    const { user } = result;
    let { tokens } = result;

    // Update role if needed — salon_admin requires email + password (dev only)
    if (user.role !== mappedRole) {
      user.role = mappedRole as any;
      if (mappedRole === 'salon_admin') {
        if (!user.email) user.email = email || `dev-${phone}@trimcity.local`;
        if (!user.password) user.password = 'DevPassword@1234';
      }
      await user.save();
      tokens = await issueTokensForUser(user);
    }

    // Self-heal: if this phone or email has an orphan salon (previous user was wiped),
    // reassign it to the current user so their data follows them.
    if (mappedRole === 'salon_admin') {
      const { default: Salon } = await import('../models/Salon');
      const query = phone ? { phone } : { email };
      const ownedSalon = await Salon.findOne(query);
      if (ownedSalon && String(ownedSalon.ownerId) !== String(user._id)) {
        const existingOwner = await (await import('../models/User')).User.findById(ownedSalon.ownerId);
        if (!existingOwner) {
          // Original owner deleted — take over.
          ownedSalon.ownerId = user._id as any;
          await ownedSalon.save();
        }
      }
    }

    sendSuccess(res, 'Dev login successful', { user, tokens });
  }
);

const __DEV_MODE__ = process.env.NODE_ENV !== 'production';

export default {
  verifyFirebase,
  sendOtp,
  verifyOtp,
  registerSalon,
  loginSalon,
  refreshToken,
  logoutUser,
  getCurrentUser,
  updateProfile,
  devPhoneLogin,
};
