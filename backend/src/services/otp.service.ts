import { OTP } from '../models/OTP';
import { OTP_CONFIG } from '../utils/constants';
import { logger } from '../utils/logger';

/**
 * Generate a random 6-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Create and store OTP in database
 */
export const createOTP = async (phone: string): Promise<string> => {
  try {
    // Delete any existing OTPs for this phone number
    await OTP.deleteMany({ phone, isVerified: false });

    // Generate new OTP
    const otpCode = generateOTP();

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_CONFIG.EXPIRY_MINUTES);

    // Create OTP record
    await OTP.create({
      phone,
      otp: otpCode,
      expiresAt,
      attempts: 0,
      isVerified: false,
    });

    logger.info(`OTP created for phone: ${phone}`);
    return otpCode;
  } catch (error) {
    logger.error('Error creating OTP:', error);
    throw new Error('Failed to create OTP');
  }
};

/**
 * Verify OTP
 */
export const verifyOTP = async (
  phone: string,
  otpCode: string
): Promise<{ isValid: boolean; message: string }> => {
  try {
    // Find the most recent OTP for this phone
    const otpRecord = await OTP.findOne({
      phone,
      isVerified: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return {
        isValid: false,
        message: 'OTP not found or already verified',
      };
    }

    // Check if OTP is expired
    if (otpRecord.isExpired()) {
      return {
        isValid: false,
        message: 'OTP has expired',
      };
    }

    // Check if max attempts reached
    if (otpRecord.hasMaxAttemptsReached()) {
      return {
        isValid: false,
        message: 'Maximum OTP attempts exceeded. Please request a new OTP',
      };
    }

    // Verify OTP
    if (otpRecord.otp !== otpCode) {
      // Increment attempts
      await otpRecord.incrementAttempts();

      const remainingAttempts = OTP_CONFIG.MAX_ATTEMPTS - otpRecord.attempts;
      return {
        isValid: false,
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining`,
      };
    }

    // Mark OTP as verified
    otpRecord.isVerified = true;
    await otpRecord.save();

    logger.info(`OTP verified successfully for phone: ${phone}`);
    return {
      isValid: true,
      message: 'OTP verified successfully',
    };
  } catch (error) {
    logger.error('Error verifying OTP:', error);
    throw new Error('Failed to verify OTP');
  }
};

/**
 * Check if OTP exists and is valid
 */
export const isOTPValid = async (phone: string): Promise<boolean> => {
  try {
    const otpRecord = await OTP.findOne({
      phone,
      isVerified: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return false;
    }

    return !otpRecord.isExpired() && !otpRecord.hasMaxAttemptsReached();
  } catch (error) {
    logger.error('Error checking OTP validity:', error);
    return false;
  }
};

/**
 * Delete expired OTPs (cleanup function)
 */
export const cleanupExpiredOTPs = async (): Promise<void> => {
  try {
    const result = await OTP.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    logger.info(`Cleaned up ${result.deletedCount} expired OTPs`);
  } catch (error) {
    logger.error('Error cleaning up expired OTPs:', error);
  }
};

/**
 * Get OTP statistics for a phone number
 */
export const getOTPStats = async (
  phone: string
): Promise<{
  hasActiveOTP: boolean;
  attemptsRemaining: number;
  expiresAt?: Date;
}> => {
  try {
    const otpRecord = await OTP.findOne({
      phone,
      isVerified: false,
    }).sort({ createdAt: -1 });

    if (!otpRecord || otpRecord.isExpired()) {
      return {
        hasActiveOTP: false,
        attemptsRemaining: 0,
      };
    }

    return {
      hasActiveOTP: true,
      attemptsRemaining: OTP_CONFIG.MAX_ATTEMPTS - otpRecord.attempts,
      expiresAt: otpRecord.expiresAt,
    };
  } catch (error) {
    logger.error('Error getting OTP stats:', error);
    return {
      hasActiveOTP: false,
      attemptsRemaining: 0,
    };
  }
};

export default {
  generateOTP,
  createOTP,
  verifyOTP,
  isOTPValid,
  cleanupExpiredOTPs,
  getOTPStats,
};
