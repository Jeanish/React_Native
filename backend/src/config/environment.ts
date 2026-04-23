import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),
  API_VERSION: Joi.string().default('v1'),
  MONGODB_URI: Joi.string().required().description('Mongo DB URL'),
  JWT_SECRET: Joi.string().required().description('JWT Secret Key'),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_SECRET: Joi.string().required().description('JWT Refresh Secret Key'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
  SENDGRID_API_KEY: Joi.string().required(),
  SENDGRID_FROM_EMAIL: Joi.string().email().required(),
  SENDGRID_FROM_NAME: Joi.string().default('Salon App'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  OTP_EXPIRY_MINUTES: Joi.number().default(10),
  OTP_MAX_ATTEMPTS: Joi.number().default(3),
  MAX_FILE_SIZE: Joi.number().default(5242880),
  ALLOWED_FILE_TYPES: Joi.string().default('image/jpeg,image/png,image/jpg'),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'debug').default('info'),
  DB_ENCRYPTION_KEY: Joi.string().required().description('32-byte base64 string for mongoose-field-encryption'),
}).unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const env = {
  NODE_ENV: envVars.NODE_ENV,
  PORT: envVars.PORT,
  API_VERSION: envVars.API_VERSION,
  MONGODB_URI: envVars.MONGODB_URI,
  JWT_SECRET: envVars.JWT_SECRET,
  JWT_EXPIRES_IN: envVars.JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET: envVars.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: envVars.JWT_REFRESH_EXPIRES_IN,
  FIREBASE_PROJECT_ID: envVars.FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY: envVars.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  FIREBASE_CLIENT_EMAIL: envVars.FIREBASE_CLIENT_EMAIL,
  CLOUDINARY_CLOUD_NAME: envVars.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: envVars.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: envVars.CLOUDINARY_API_SECRET,
  SENDGRID_API_KEY: envVars.SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL: envVars.SENDGRID_FROM_EMAIL,
  SENDGRID_FROM_NAME: envVars.SENDGRID_FROM_NAME,
  RATE_LIMIT_WINDOW_MS: envVars.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS: envVars.RATE_LIMIT_MAX_REQUESTS,
  CORS_ORIGIN: envVars.CORS_ORIGIN,
  OTP_EXPIRY_MINUTES: envVars.OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS: envVars.OTP_MAX_ATTEMPTS,
  MAX_FILE_SIZE: envVars.MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES: envVars.ALLOWED_FILE_TYPES,
  LOG_LEVEL: envVars.LOG_LEVEL,
  DB_ENCRYPTION_KEY: envVars.DB_ENCRYPTION_KEY,
};

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
