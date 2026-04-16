import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../errorHandler';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '../../../shared/errors';
import logger from '../../../shared/logger';

// Mock logger
jest.mock('../../../shared/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

describe('errorHandler middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      path: '/api/test',
      method: 'GET',
      body: {},
      query: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('ApplicationError handling', () => {
    it('should handle ValidationError with 400 status', () => {
      const error = new ValidationError('Invalid email format', { field: 'email' });

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
          details: { field: 'email' },
        },
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle AuthenticationError with 401 status', () => {
      const error = new AuthenticationError('Invalid credentials');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Invalid credentials',
          details: undefined,
        },
      });
    });

    it('should handle AuthorizationError with 403 status', () => {
      const error = new AuthorizationError('Access denied');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Access denied',
          details: undefined,
        },
      });
    });

    it('should handle NotFoundError with 404 status', () => {
      const error = new NotFoundError('User');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
          details: undefined,
        },
      });
    });

    it('should handle ConflictError with 409 status', () => {
      const error = new ConflictError('Email already exists');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'CONFLICT',
          message: 'Email already exists',
          details: undefined,
        },
      });
    });

    it('should handle InternalServerError with 500 status', () => {
      const error = new InternalServerError('Database error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database error',
          details: undefined,
        },
      });
    });
  });

  describe('Database error handling', () => {
    it('should handle unique constraint violation (PostgreSQL code 23505)', () => {
      const error = new Error('Unique constraint violation') as any;
      error.code = '23505';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this value already exists',
        },
      });
    });

    it('should handle foreign key constraint violation (PostgreSQL code 23503)', () => {
      const error = new Error('Foreign key constraint violation') as any;
      error.code = '23503';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_REFERENCE',
          message: 'Referenced resource does not exist',
        },
      });
    });
  });

  describe('JWT error handling', () => {
    it('should handle JsonWebTokenError', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
        },
      });
    });

    it('should handle TokenExpiredError', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
        },
      });
    });
  });

  describe('Multer error handling', () => {
    it('should handle file size limit error', () => {
      const error = new Error('File too large') as any;
      error.name = 'MulterError';
      error.code = 'LIMIT_FILE_SIZE';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds the maximum limit of 10MB',
        },
      });
    });

    it('should handle file count limit error', () => {
      const error = new Error('Too many files') as any;
      error.name = 'MulterError';
      error.code = 'LIMIT_FILE_COUNT';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Maximum of 10 files allowed per training record',
        },
      });
    });

    it('should handle generic multer error', () => {
      const error = new Error('Upload failed') as any;
      error.name = 'MulterError';
      error.code = 'UNKNOWN';

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'FILE_UPLOAD_ERROR',
          message: 'File upload failed',
        },
      });
    });
  });

  describe('Unknown error handling', () => {
    it('should handle unknown errors with generic message', () => {
      const error = new Error('Some unexpected error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      });
    });

    it('should never expose internal error details', () => {
      const error = new Error('Database connection string: postgres://user:pass@host/db');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      const response = jsonMock.mock.calls[0][0];
      expect(response.error.message).toBe('An unexpected error occurred');
      expect(response.error.message).not.toContain('postgres://');
    });
  });

  describe('Logging', () => {
    it('should log error with request context', () => {
      const error = new ValidationError('Test error');
      const requestWithContext = {
        ...mockRequest,
        path: '/api/users',
        method: 'POST',
        body: { email: 'test@example.com' },
        query: { filter: 'active' },
      };

      errorHandler(error, requestWithContext as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error',
          path: '/api/users',
          method: 'POST',
          body: { email: 'test@example.com' },
          query: { filter: 'active' },
        })
      );
    });

    it('should sanitize sensitive fields in request body', () => {
      const error = new Error('Test error');
      const requestWithSensitiveData = {
        ...mockRequest,
        body: {
          email: 'test@example.com',
          password: 'secret123',
          token: 'jwt-token',
        },
      };

      errorHandler(error, requestWithSensitiveData as Request, mockResponse as Response, mockNext);

      const logCall = (logger.error as jest.Mock).mock.calls[0][0];
      expect(logCall.body.email).toBe('test@example.com');
      expect(logCall.body.password).toBe('[REDACTED]');
      expect(logCall.body.token).toBe('[REDACTED]');
    });

    it('should include user ID if available', () => {
      const error = new Error('Test error');
      (mockRequest as any).user = { id: 'user-123' };

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });
  });
});
