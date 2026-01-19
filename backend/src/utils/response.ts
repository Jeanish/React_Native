import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Send success response
 */
export const sendSuccess = <T = any>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  };

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
export const sendError = (
  res: Response,
  message: string,
  code: string,
  statusCode: number = 400,
  details?: any
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    error: {
      code,
      ...(details && { details }),
    },
  };

  return res.status(statusCode).json(response);
};

/**
 * Send validation error response
 */
export const sendValidationError = (
  res: Response,
  errors: any[]
): Response => {
  return sendError(
    res,
    'Validation failed',
    'VALIDATION_ERROR',
    400,
    errors
  );
};

/**
 * Send unauthorized error response
 */
export const sendUnauthorized = (
  res: Response,
  message: string = 'Unauthorized access'
): Response => {
  return sendError(res, message, 'AUTHENTICATION_ERROR', 401);
};

/**
 * Send forbidden error response
 */
export const sendForbidden = (
  res: Response,
  message: string = 'You do not have permission to perform this action'
): Response => {
  return sendError(res, message, 'AUTHORIZATION_ERROR', 403);
};

/**
 * Send not found error response
 */
export const sendNotFound = (
  res: Response,
  message: string = 'Resource not found'
): Response => {
  return sendError(res, message, 'NOT_FOUND', 404);
};

/**
 * Send conflict error response
 */
export const sendConflict = (
  res: Response,
  message: string,
  details?: any
): Response => {
  return sendError(res, message, 'CONFLICT', 409, details);
};

/**
 * Send internal server error response
 */
export const sendInternalError = (
  res: Response,
  message: string = 'An internal error occurred'
): Response => {
  return sendError(res, message, 'INTERNAL_ERROR', 500);
};

/**
 * Send rate limit error response
 */
export const sendRateLimitError = (
  res: Response,
  message: string = 'Too many requests, please try again later'
): Response => {
  return sendError(res, message, 'RATE_LIMIT_EXCEEDED', 429);
};

/**
 * Send paginated response
 */
export const sendPaginatedResponse = <T = any>(
  res: Response,
  message: string,
  data: T[],
  page: number,
  limit: number,
  total: number
): Response => {
  const totalPages = Math.ceil(total / limit);

  return sendSuccess(
    res,
    message,
    data,
    200,
    {
      page,
      limit,
      total,
      totalPages,
    }
  );
};
