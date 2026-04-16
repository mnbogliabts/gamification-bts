import {
  ApplicationError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} from '../errors';

describe('Error Classes', () => {
  describe('ApplicationError', () => {
    it('should create an error with all properties', () => {
      const error = new ApplicationError(400, 'Test error', 'TEST_ERROR', { field: 'test' });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApplicationError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ field: 'test' });
      expect(error.name).toBe('ApplicationError');
      expect(error.stack).toBeDefined();
    });

    it('should work without details', () => {
      const error = new ApplicationError(500, 'Server error', 'SERVER_ERROR');

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Server error');
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.details).toBeUndefined();
    });
  });

  describe('ValidationError', () => {
    it('should create a 400 error with VALIDATION_ERROR code', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      expect(error).toBeInstanceOf(ApplicationError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.name).toBe('ValidationError');
    });

    it('should work without details', () => {
      const error = new ValidationError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.details).toBeUndefined();
    });
  });

  describe('AuthenticationError', () => {
    it('should create a 401 error with AUTHENTICATION_ERROR code', () => {
      const error = new AuthenticationError('Invalid credentials');

      expect(error).toBeInstanceOf(ApplicationError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid credentials');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.name).toBe('AuthenticationError');
    });

    it('should use default message when none provided', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication failed');
    });
  });

  describe('AuthorizationError', () => {
    it('should create a 403 error with AUTHORIZATION_ERROR code', () => {
      const error = new AuthorizationError('Insufficient permissions');

      expect(error).toBeInstanceOf(ApplicationError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Insufficient permissions');
      expect(error.code).toBe('AUTHORIZATION_ERROR');
      expect(error.name).toBe('AuthorizationError');
    });

    it('should use default message when none provided', () => {
      const error = new AuthorizationError();

      expect(error.message).toBe('Access denied');
    });
  });

  describe('NotFoundError', () => {
    it('should create a 404 error with NOT_FOUND code', () => {
      const error = new NotFoundError('User');

      expect(error).toBeInstanceOf(ApplicationError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
    });

    it('should format message with resource name', () => {
      const error = new NotFoundError('Training Record');

      expect(error.message).toBe('Training Record not found');
    });
  });

  describe('ConflictError', () => {
    it('should create a 409 error with CONFLICT code', () => {
      const error = new ConflictError('Email already exists');

      expect(error).toBeInstanceOf(ApplicationError);
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Email already exists');
      expect(error.code).toBe('CONFLICT');
      expect(error.name).toBe('ConflictError');
    });
  });

  describe('InternalServerError', () => {
    it('should create a 500 error with INTERNAL_ERROR code', () => {
      const error = new InternalServerError('Database connection failed');

      expect(error).toBeInstanceOf(ApplicationError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Database connection failed');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.name).toBe('InternalServerError');
    });

    it('should use default message when none provided', () => {
      const error = new InternalServerError();

      expect(error.message).toBe('Internal server error');
    });
  });

  describe('Error inheritance', () => {
    it('should be catchable as Error', () => {
      const error = new ValidationError('Test');

      expect(error instanceof Error).toBe(true);
    });

    it('should be catchable as ApplicationError', () => {
      const error = new ValidationError('Test');

      expect(error instanceof ApplicationError).toBe(true);
    });

    it('should preserve stack trace', () => {
      const error = new ValidationError('Test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ValidationError');
    });
  });
});
