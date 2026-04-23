import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { sendValidationError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Validate request body against Joi schema
 */
export const validateBody = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation error:', { errors, body: req.body });
      sendValidationError(res, errors);
      return;
    }

    // Replace request body with validated and sanitized value
    req.body = value;
    next();
  };
};

/**
 * Validate request query parameters against Joi schema
 */
export const validateQuery = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Query validation error:', { errors, query: req.query });
      sendValidationError(res, errors);
      return;
    }

    // Replace request query with validated and sanitized value
    req.query = value;
    next();
  };
};

/**
 * Validate request params against Joi schema
 */
export const validateParams = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Params validation error:', { errors, params: req.params });
      sendValidationError(res, errors);
      return;
    }

    // Replace request params with validated and sanitized value
    req.params = value;
    next();
  };
};

/**
 * Validate multiple parts of request (body, query, params)
 */
export const validate = (schemas: {
  body?: Schema;
  query?: Schema;
  params?: Schema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate body
    if (schemas.body) {
      const { error, value } = schemas.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        errors.push(
          ...error.details.map((detail) => ({
            field: `body.${detail.path.join('.')}`,
            message: detail.message,
          }))
        );
      } else {
        req.body = value;
      }
    }

    // Validate query
    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        errors.push(
          ...error.details.map((detail) => ({
            field: `query.${detail.path.join('.')}`,
            message: detail.message,
          }))
        );
      } else {
        req.query = value;
      }
    }

    // Validate params
    if (schemas.params) {
      const { error, value } = schemas.params.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        errors.push(
          ...error.details.map((detail) => ({
            field: `params.${detail.path.join('.')}`,
            message: detail.message,
          }))
        );
      } else {
        req.params = value;
      }
    }

    if (errors.length > 0) {
      logger.warn('Validation errors:', errors);
      sendValidationError(res, errors);
      return;
    }

    next();
  };
};

export default {
  validateBody,
  validateQuery,
  validateParams,
  validate,
};
