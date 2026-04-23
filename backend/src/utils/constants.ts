export const USER_ROLES = {
  CUSTOMER: 'customer',
  SALON_ADMIN: 'salon_admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export const SALON_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const;

export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export const QUEUE_STATUS = {
  WAITING: 'waiting',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const NOTIFICATION_TYPES = {
  APPOINTMENT: 'appointment',
  QUEUE: 'queue',
  GENERAL: 'general',
  PROMOTION: 'promotion',
} as const;

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 50,
} as const;

export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 3,
} as const;

export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
  MAX_IMAGES_PER_SALON: 5,
} as const;

export const SEARCH_RADIUS = {
  DEFAULT: 5, // km
  MAX: 50, // km
} as const;

export const TIME_SLOT_DURATION = 30; // minutes

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const;

export const SUCCESS_MESSAGES = {
  OTP_SENT: 'OTP sent successfully via push notification',
  OTP_VERIFIED: 'OTP verified successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logged out successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  SALON_CREATED: 'Salon created successfully',
  SALON_UPDATED: 'Salon updated successfully',
  SERVICE_CREATED: 'Service created successfully',
  SERVICE_UPDATED: 'Service updated successfully',
  SERVICE_DELETED: 'Service deleted successfully',
  APPOINTMENT_CREATED: 'Appointment booked successfully',
  APPOINTMENT_UPDATED: 'Appointment updated successfully',
  QUEUE_JOINED: 'Added to queue successfully',
  QUEUE_UPDATED: 'Queue status updated',
  NOTIFICATION_SENT: 'Notification sent successfully',
} as const;

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  INVALID_OTP: 'Invalid OTP',
  OTP_EXPIRED: 'OTP has expired',
  OTP_MAX_ATTEMPTS: 'Maximum OTP attempts exceeded',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'Resource not found',
  USER_NOT_FOUND: 'User not found',
  SALON_NOT_FOUND: 'Salon not found',
  SERVICE_NOT_FOUND: 'Service not found',
  APPOINTMENT_NOT_FOUND: 'Appointment not found',
  QUEUE_NOT_FOUND: 'Queue entry not found',
  DUPLICATE_EMAIL: 'Email already exists',
  DUPLICATE_PHONE: 'Phone number already exists',
  INVALID_TOKEN: 'Invalid or expired token',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  INVALID_FILE_TYPE: 'Invalid file type',
  SLOT_NOT_AVAILABLE: 'Selected time slot is not available',
  SALON_NOT_APPROVED: 'Salon is not approved yet',
  INTERNAL_ERROR: 'An internal error occurred',
} as const;
