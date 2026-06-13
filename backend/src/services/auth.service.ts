import mongoose from 'mongoose';
import { User, IUser } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { generateTokenPair, verifyRefreshToken, JWTPayload } from '../utils/jwt';
import { USER_ROLES, ERROR_MESSAGES } from '../utils/constants';
import { logger } from '../utils/logger';
import { env } from '../config/environment';

/**
 * Register a new customer via OTP
 */
export const registerCustomer = async (
  phone: string,
  fcmToken?: string,
  firstName?: string,
  lastName?: string
): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> => {
  try {
    // Check if user already exists
    let user = await User.findOne({ phone });

    if (user) {
      // Update FCM token if provided
      if (fcmToken) {
        user.fcmToken = fcmToken;
      }
      user.isPhoneVerified = true;
      user.lastLogin = new Date();
      // Heal stale salon_admin/super_admin records missing email/password
      if (
        (user.role === USER_ROLES.SALON_ADMIN || user.role === USER_ROLES.SUPER_ADMIN) &&
        (!user.email || !user.password)
      ) {
        const bcrypt = await import('bcryptjs');
        if (!user.email) user.email = `dev-${phone}@trimcity.local`;
        if (!user.password) user.password = await bcrypt.default.hash('DevPassword@1234', 12);
      }
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        phone,
        role: USER_ROLES.CUSTOMER,
        fcmToken,
        firstName,
        lastName,
        isPhoneVerified: true,
        isActive: true,
        lastLogin: new Date(),
      });
    }

    // Generate tokens
    const payload: JWTPayload = {
      userId: user._id.toString(),
      role: user.role,
      phone: user.phone,
    };

    const tokens = generateTokenPair(payload);

    // Store refresh token
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(
      refreshTokenExpiry.getDate() + parseInt(env.JWT_REFRESH_EXPIRES_IN)
    );

    await RefreshToken.create({
      token: tokens.refreshToken,
      userId: user._id,
      expiresAt: refreshTokenExpiry,
      isRevoked: false,
    });

    logger.info(`Customer registered/logged in: ${user._id}`);

    return { user, tokens };
  } catch (error: any) {
    logger.error('Error registering customer:', error);
    // Preserve the original message so callers can see the actual cause
    throw new Error(error?.message ?? 'Failed to register customer');
  }
};

/**
 * Register a new salon admin
 */
export const registerSalonAdmin = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> => {
  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new Error(ERROR_MESSAGES.DUPLICATE_EMAIL);
    }

    // Check if phone already exists (if provided)
    if (data.phone) {
      const existingPhone = await User.findOne({ phone: data.phone });
      if (existingPhone) {
        throw new Error(ERROR_MESSAGES.DUPLICATE_PHONE);
      }
    }

    // Create new salon admin
    const user = await User.create({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: USER_ROLES.SALON_ADMIN,
      isEmailVerified: false, // Will be verified via email
      isActive: true,
      lastLogin: new Date(),
    });

    // Generate tokens
    const payload: JWTPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const tokens = generateTokenPair(payload);

    // Store refresh token
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(
      refreshTokenExpiry.getDate() + parseInt(env.JWT_REFRESH_EXPIRES_IN)
    );

    await RefreshToken.create({
      token: tokens.refreshToken,
      userId: user._id,
      expiresAt: refreshTokenExpiry,
      isRevoked: false,
    });

    logger.info(`Salon admin registered: ${user._id}`);

    return { user, tokens };
  } catch (error) {
    logger.error('Error registering salon admin:', error);
    throw error;
  }
};

/**
 * Login salon admin with email and password
 */
export const loginSalonAdmin = async (
  email: string,
  password: string
): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> => {
  try {
    // Find user by email and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const payload: JWTPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    const tokens = generateTokenPair(payload);

    // Store refresh token
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(
      refreshTokenExpiry.getDate() + parseInt(env.JWT_REFRESH_EXPIRES_IN)
    );

    await RefreshToken.create({
      token: tokens.refreshToken,
      userId: user._id,
      expiresAt: refreshTokenExpiry,
      isRevoked: false,
    });

    logger.info(`Salon admin logged in: ${user._id}`);

    // Remove password from response
    const userResponse = user.toJSON();
    delete (userResponse as any).password;

    return { user, tokens };
  } catch (error) {
    logger.error('Error logging in salon admin:', error);
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database and is not revoked
    const tokenRecord = await RefreshToken.findOne({
      token: refreshToken,
      isRevoked: false,
    });

    if (!tokenRecord) {
      throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
    }

    // Check if token is expired
    if (tokenRecord.isExpired()) {
      throw new Error('Refresh token has expired');
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Generate new token pair
    const payload: JWTPayload = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      phone: user.phone,
    };

    const tokens = generateTokenPair(payload);

    // Revoke old refresh token
    await tokenRecord.revoke();

    // Store new refresh token
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(
      refreshTokenExpiry.getDate() + parseInt(env.JWT_REFRESH_EXPIRES_IN)
    );

    await RefreshToken.create({
      token: tokens.refreshToken,
      userId: user._id,
      expiresAt: refreshTokenExpiry,
      isRevoked: false,
    });

    logger.info(`Access token refreshed for user: ${user._id}`);

    return tokens;
  } catch (error) {
    logger.error('Error refreshing access token:', error);
    throw error;
  }
};

/**
 * Logout user by revoking refresh token
 */
export const logout = async (
  userId: string,
  refreshToken?: string
): Promise<void> => {
  try {
    if (refreshToken) {
      // Revoke specific refresh token
      await RefreshToken.updateOne(
        { token: refreshToken, userId: new mongoose.Types.ObjectId(userId) },
        { isRevoked: true }
      );
    } else {
      // Revoke all refresh tokens for user
      await RefreshToken.updateMany(
        { userId: new mongoose.Types.ObjectId(userId), isRevoked: false },
        { isRevoked: true }
      );
    }

    logger.info(`User logged out: ${userId}`);
  } catch (error) {
    logger.error('Error logging out user:', error);
    throw new Error('Failed to logout');
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<IUser | null> => {
  try {
    return await User.findById(userId).populate('salonId');
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<IUser>
): Promise<IUser | null> => {
  try {
    // Remove fields that shouldn't be updated directly
    const { password, role, isActive, ...allowedUpdates } = updates as any;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    if (user) {
      logger.info(`User profile updated: ${userId}`);
    }

    return user;
  } catch (error) {
    logger.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Update FCM token
 */
export const updateFCMToken = async (
  userId: string,
  fcmToken: string
): Promise<void> => {
  try {
    await User.findByIdAndUpdate(userId, { fcmToken });
    logger.info(`FCM token updated for user: ${userId}`);
  } catch (error) {
    logger.error('Error updating FCM token:', error);
    throw new Error('Failed to update FCM token');
  }
};

export default {
  registerCustomer,
  registerSalonAdmin,
  loginSalonAdmin,
  refreshAccessToken,
  logout,
  getUserById,
  updateUserProfile,
  updateFCMToken,
};
