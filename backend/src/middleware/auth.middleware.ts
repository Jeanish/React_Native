import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwt';
import { getUserById } from '../services/auth.service';
import { sendUnauthorized } from '../utils/response';
import { ERROR_MESSAGES } from '../utils/constants';
import { logger } from '../utils/logger';
import { IUser } from '../models/User';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      sendUnauthorized(res, 'No authentication token provided');
      return;
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error: any) {
      sendUnauthorized(res, error.message || ERROR_MESSAGES.INVALID_TOKEN);
      return;
    }

    // Get user from database
    const user = await getUserById(decoded.userId);

    if (!user) {
      sendUnauthorized(res, ERROR_MESSAGES.USER_NOT_FOUND);
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      sendUnauthorized(res, 'Account is deactivated');
      return;
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    sendUnauthorized(res, 'Authentication failed');
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is provided, but doesn't fail if not
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      next();
      return;
    }

    try {
      const decoded = verifyAccessToken(token);
      const user = await getUserById(decoded.userId);

      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id.toString();
      }
    } catch (error) {
      // Silently fail for optional authentication
      logger.debug('Optional authentication failed:', error);
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next();
  }
};

export default {
  authenticate,
  optionalAuthenticate,
};
