import { Request, Response, NextFunction } from 'express';
import { sendForbidden } from '../utils/response';
import { USER_ROLES, ERROR_MESSAGES } from '../utils/constants';
import { logger } from '../utils/logger';

/**
 * Role-based access control middleware
 * Checks if user has required role(s)
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        sendForbidden(res, ERROR_MESSAGES.UNAUTHORIZED);
        return;
      }

      // Check if user has required role
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn(
          `Access denied for user ${req.userId} with role ${req.user.role}. Required: ${allowedRoles.join(', ')}`
        );
        sendForbidden(res, ERROR_MESSAGES.FORBIDDEN);
        return;
      }

      next();
    } catch (error) {
      logger.error('Role check error:', error);
      sendForbidden(res, 'Authorization failed');
    }
  };
};

/**
 * Check if user is a customer
 */
export const requireCustomer = requireRole(USER_ROLES.CUSTOMER);

/**
 * Check if user is a salon admin
 */
export const requireSalonAdmin = requireRole(USER_ROLES.SALON_ADMIN);

/**
 * Check if user is a super admin
 */
export const requireSuperAdmin = requireRole(USER_ROLES.SUPER_ADMIN);

/**
 * Check if user is any type of admin (salon or super)
 */
export const requireAnyAdmin = requireRole(
  USER_ROLES.SALON_ADMIN,
  USER_ROLES.SUPER_ADMIN
);

/**
 * Check if user owns the resource or is an admin
 */
export const requireOwnerOrAdmin = (resourceUserIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        sendForbidden(res, ERROR_MESSAGES.UNAUTHORIZED);
        return;
      }

      const resourceUserId =
        req.params[resourceUserIdField] || req.body[resourceUserIdField];

      // Allow if user is admin
      if (
        req.user.role === USER_ROLES.SUPER_ADMIN ||
        req.user.role === USER_ROLES.SALON_ADMIN
      ) {
        next();
        return;
      }

      // Allow if user owns the resource
      if (req.userId === resourceUserId) {
        next();
        return;
      }

      logger.warn(
        `Access denied for user ${req.userId} trying to access resource owned by ${resourceUserId}`
      );
      sendForbidden(res, 'You can only access your own resources');
    } catch (error) {
      logger.error('Owner/admin check error:', error);
      sendForbidden(res, 'Authorization failed');
    }
  };
};

/**
 * Check if salon admin owns the salon
 */
export const requireSalonOwnership = (salonIdField: string = 'salonId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        sendForbidden(res, ERROR_MESSAGES.UNAUTHORIZED);
        return;
      }

      // Super admin can access any salon
      if (req.user.role === USER_ROLES.SUPER_ADMIN) {
        next();
        return;
      }

      // Salon admin can only access their own salon
      if (req.user.role === USER_ROLES.SALON_ADMIN) {
        const salonId = req.params[salonIdField] || req.body[salonIdField];

        if (!req.user.salonId) {
          sendForbidden(res, 'No salon associated with your account');
          return;
        }

        if (req.user.salonId.toString() !== salonId) {
          logger.warn(
            `Salon admin ${req.userId} tried to access salon ${salonId} but owns ${req.user.salonId}`
          );
          sendForbidden(res, 'You can only access your own salon');
          return;
        }

        next();
        return;
      }

      sendForbidden(res, ERROR_MESSAGES.FORBIDDEN);
    } catch (error) {
      logger.error('Salon ownership check error:', error);
      sendForbidden(res, 'Authorization failed');
    }
  };
};

export default {
  requireRole,
  requireCustomer,
  requireSalonAdmin,
  requireSuperAdmin,
  requireAnyAdmin,
  requireOwnerOrAdmin,
  requireSalonOwnership,
};
