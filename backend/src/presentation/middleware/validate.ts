import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../../shared/errors';

/**
 * Generic request validation middleware using Zod schemas.
 * Validates req.body against the provided schema.
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */
export function validateRequest(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const details = formatZodErrors(result.error);
        next(new ValidationError('Validation failed', details));
        return;
      }

      // Replace body with parsed (and potentially transformed) data
      req.body = result.data;
      next();
    } catch (error) {
      next(new ValidationError('Validation failed'));
    }
  };
}

/**
 * Validate query parameters against a Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        const details = formatZodErrors(result.error);
        next(new ValidationError('Query validation failed', details));
        return;
      }

      req.query = result.data;
      next();
    } catch (error) {
      next(new ValidationError('Query validation failed'));
    }
  };
}

/**
 * Validate route parameters against a Zod schema.
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        const details = formatZodErrors(result.error);
        next(new ValidationError('Parameter validation failed', details));
        return;
      }

      req.params = result.data;
      next();
    } catch (error) {
      next(new ValidationError('Parameter validation failed'));
    }
  };
}

/**
 * Format Zod errors into a user-friendly structure.
 * Returns an array of { field, message } objects.
 */
function formatZodErrors(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

// ---- Common reusable Zod schemas for the platform ----

export const emailSchema = z
  .string()
  .email('Invalid email format');

export const trainingHoursSchema = z
  .number()
  .min(0.5, 'Training hours must be at least 0.5')
  .max(1000, 'Training hours must not exceed 1000')
  .refine(
    (val) => {
      const parts = val.toString().split('.');
      return !parts[1] || parts[1].length <= 2;
    },
    { message: 'Training hours must have at most 2 decimal places' }
  );

export const isoDateSchema = z
  .string()
  .refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date format. Expected ISO 8601 format' }
  );

export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');
