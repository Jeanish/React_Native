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
 * Helper to build query based on target type (email or phone)
 */
const getTargetQuery = (target: string, extra: Record<string, unknown> = {}) => {
  const isEmail = target.includes('@');
  return isEmail 
    ? { email: target.trim().toLowerCase(), ...extra }
    : { phone: target.trim(), ...extra };
};

/**
 * Create and store OTP in database
 */
export const createOTP = async (target: string): Promise<string> => {
  try {
    const isEmail = target.includes('@');
    const deleteQuery = getTargetQuery(target, { isVerified: false });

    // Delete any existing OTPs for this target
    await OTP.deleteMany(deleteQuery);

    // Generate new OTP
    const otpCode = generateOTP();

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_CONFIG.EXPIRY_MINUTES);

    // Create OTP record data
    const otpData: Record<string, unknown> = {
      otp: otpCode,
      expiresAt,
      attempts: 0,
      isVerified: false,
    };

    if (isEmail) {
      otpData.email = target.trim().toLowerCase();
    } else {
      otpData.phone = target.trim();
    }

    // Create OTP record
    await OTP.create(otpData);

    logger.info(`OTP created for target: ${target}`);
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
  target: string,
  otpCode: string
): Promise<{ isValid: boolean; message: string }> => {
  try {
    const findQuery = getTargetQuery(target, { isVerified: false });

    // Find the most recent OTP for this target
    const otpRecord = await OTP.findOne(findQuery).sort({ createdAt: -1 });

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

    logger.info(`OTP verified successfully for target: ${target}`);
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
export const isOTPValid = async (target: string): Promise<boolean> => {
  try {
    const findQuery = getTargetQuery(target, { isVerified: false });
    const otpRecord = await OTP.findOne(findQuery).sort({ createdAt: -1 });

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
 * Get OTP statistics for a target
 */
export const getOTPStats = async (
  target: string
): Promise<{
  hasActiveOTP: boolean;
  attemptsRemaining: number;
  expiresAt?: Date;
}> => {
  try {
    const findQuery = getTargetQuery(target, { isVerified: false });
    const otpRecord = await OTP.findOne(findQuery).sort({ createdAt: -1 });

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
