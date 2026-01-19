import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { isDevelopment } from '../config/environment';
import { ERROR_CODES } from '../utils/constants';

/**
 * Custom error class for operational errors
 */
export class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = ERROR_CODES.INTERNAL_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let code: string = ERROR_CODES.INTERNAL_ERROR;
  let message = 'An internal error occurred';

  // Handle AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  }
  // Handle Mongoose validation errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Validation failed';
  }
  // Handle Mongoose duplicate key errors
  else if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    statusCode = 409;
    code = ERROR_CODES.CONFLICT;
    const field = Object.keys((err as any).keyPattern)[0];
    message = `${field} already exists`;
  }
  // Handle Mongoose cast errors (invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = 'Invalid ID format';
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = ERROR_CODES.AUTHENTICATION_ERROR;
    message = 'Invalid token';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = ERROR_CODES.AUTHENTICATION_ERROR;
    message = 'Token has expired';
  }
  // Handle other errors
  else if (err.message) {
    message = err.message;
  }

  // Log error
  logger.error('Error occurred:', {
    statusCode,
    code,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.userId,
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      ...(isDevelopment && { stack: err.stack }),
    },
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found error handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: {
      code: ERROR_CODES.NOT_FOUND,
      path: req.originalUrl,
      method: req.method,
    },
  });
};

export default {
  AppError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
};
