import mongoose, { Document, Schema } from 'mongoose';
import { OTP_CONFIG } from '../utils/constants';

export interface IOTP extends Document {
  _id: mongoose.Types.ObjectId;
  phone: string;
  otp: string;
  attempts: number;
  expiresAt: Date;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  isExpired(): boolean;
  hasMaxAttemptsReached(): boolean;
  incrementAttempts(): Promise<void>;
}

const otpSchema = new Schema<IOTP>(
  {
    phone: {
      type: String,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      max: OTP_CONFIG.MAX_ATTEMPTS,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
otpSchema.index({ phone: 1, expiresAt: 1 });
otpSchema.index({ phone: 1, isVerified: 1 });
otpSchema.index({ email: 1, expiresAt: 1 });
otpSchema.index({ email: 1, isVerified: 1 });

// TTL index to automatically delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if OTP is expired
otpSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt;
};

// Method to check if max attempts reached
otpSchema.methods.hasMaxAttemptsReached = function (): boolean {
  return this.attempts >= OTP_CONFIG.MAX_ATTEMPTS;
};

// Method to increment attempts
otpSchema.methods.incrementAttempts = async function (): Promise<void> {
  this.attempts += 1;
  await this.save();
};

export const OTP = mongoose.model<IOTP>('OTP', otpSchema);
