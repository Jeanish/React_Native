import Joi from 'joi';
import { USER_ROLES } from './constants';

/**
 * Phone number validation schema
 * Supports international format with country code
 */
export const phoneSchema = Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .required()
  .messages({
    'string.pattern.base': 'Phone number must be in valid international format',
    'any.required': 'Phone number is required',
  });

/**
 * Email validation schema
 */
export const emailSchema = Joi.string()
  .email()
  .lowercase()
  .trim()
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  });

/**
 * Password validation schema
 */
export const passwordSchema = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'Password is required',
  });

/**
 * OTP validation schema
 */
export const otpSchema = Joi.string()
  .length(6)
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must contain only numbers',
    'any.required': 'OTP is required',
  });

/**
 * Name validation schema
 */
export const nameSchema = Joi.string()
  .min(2)
  .max(50)
  .trim()
  .pattern(/^[a-zA-Z\s]+$/)
  .messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 50 characters',
    'string.pattern.base': 'Name must contain only letters and spaces',
  });

/**
 * Role validation schema
 */
export const roleSchema = Joi.string()
  .valid(...Object.values(USER_ROLES))
  .messages({
    'any.only': 'Invalid role specified',
  });

/**
 * MongoDB ObjectId validation schema
 */
export const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid ID format',
  });

/**
 * FCM Token validation schema
 */
export const fcmTokenSchema = Joi.string()
  .min(10)
  .required()
  .messages({
    'string.min': 'Invalid FCM token',
    'any.required': 'FCM token is required',
  });

/**
 * Verify Firebase Auth request validation
 */
export const verifyFirebaseSchema = Joi.object({
  idToken: Joi.string().required().messages({
    'any.required': 'Firebase ID token is required',
  }),
  fcmToken: fcmTokenSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
});

/**
 * Salon admin login validation
 */
export const salonLoginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

/**
 * Salon admin registration validation
 */
export const salonRegisterSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema.required(),
  lastName: nameSchema.required(),
  phone: phoneSchema,
  salonName: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Salon name must be at least 3 characters long',
    'string.max': 'Salon name must not exceed 100 characters',
    'any.required': 'Salon name is required',
  }),
});

/**
 * Refresh token request validation
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

/**
 * Update profile validation
 */
export const updateProfileSchema = Joi.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  avatar: Joi.string().uri().optional().messages({
    'string.uri': 'Avatar must be a valid URL',
  }),
});

/**
 * Update FCM token validation
 */
export const updateFCMTokenSchema = Joi.object({
  fcmToken: fcmTokenSchema,
});

/**
 * Change password validation
 */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
});

/**
 * Pagination validation
 */
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});
