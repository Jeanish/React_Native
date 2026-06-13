import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../utils/constants';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email?: string;
  phone?: string;
  password?: string;
  role: typeof USER_ROLES[keyof typeof USER_ROLES];
  firstName?: string;
  lastName?: string;
  avatar?: string;
  fcmToken?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  salonId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.CUSTOMER,
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    fcmToken: {
      type: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLogin: {
      type: Date,
    },
    salonId: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const result: any = { ...ret };
        delete result.password;
        delete result.__v;
        return result;
      },
    },
  }
);

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ salonId: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name method
userSchema.methods.getFullName = function (): string {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || 'User';
};

// Validation: Either email or phone must be provided
userSchema.pre('validate', function (next) {
  if (!this.email && !this.phone) {
    next(new Error('Either email or phone number is required'));
  } else {
    next();
  }
});

// Validation: Salon admins must have email and password
userSchema.pre('validate', function (next) {
  if (
    (this.role === USER_ROLES.SALON_ADMIN || this.role === USER_ROLES.SUPER_ADMIN) &&
    (!this.email || !this.password)
  ) {
    next(new Error('Salon admins must have email and password'));
  } else {
    next();
  }
});

export const User = mongoose.model<IUser>('User', userSchema);
