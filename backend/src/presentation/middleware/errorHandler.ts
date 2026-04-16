import { Request, Response, NextFunction } from 'express';
import { ApplicationError } from '../../shared/errors';
import logger from '../../shared/logger';

/**
 * Global error handler middleware
 * Catches all errors and returns appropriate responses
 * Never exposes sensitive information in error messages
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error details (with full stack trace and context)
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
    body: sanitizeBody(req.body),
    query: req.query,
  });

  // Handle known application errors
  if (err instanceof ApplicationError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle database unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError' || (err as any).code === '23505') {
    res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'A record with this value already exists',
      },
    });
    return;
  }

  // Handle database foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError' || (err as any).code === '23503') {
    res.status(400).json({
      error: {
        code: 'INVALID_REFERENCE',
        message: 'Referenced resource does not exist',
      },
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      },
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
      },
    });
    return;
  }

  // Handle multer file upload errors
  if (err.name === 'MulterError') {
    const multerErr = err as any;
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds the maximum limit of 10MB',
        },
      });
      return;
    }
    if (multerErr.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Maximum of 10 files allowed per training record',
        },
      });
      return;
    }
    res.status(400).json({
      error: {
        code: 'FILE_UPLOAD_ERROR',
        message: 'File upload failed',
      },
    });
    return;
  }

  // Handle unknown errors (don't expose internal details)
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}

/**
 * Sanitize request body to remove sensitive information before logging
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey'];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}
