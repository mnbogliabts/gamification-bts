/**
 * Base application error class
 * All custom errors should extend this class
 */
export class ApplicationError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Validation errors
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details);
  }
}

/**
 * 401 Unauthorized - Authentication errors
 */
export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication failed') {
    super(401, message, 'AUTHENTICATION_ERROR');
  }
}

/**
 * 403 Forbidden - Authorization errors
 */
export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Access denied') {
    super(403, message, 'AUTHORIZATION_ERROR');
  }
}

/**
 * 404 Not Found - Resource not found errors
 */
export class NotFoundError extends ApplicationError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

/**
 * 409 Conflict - Duplicate or conflicting resource errors
 */
export class ConflictError extends ApplicationError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

/**
 * 500 Internal Server Error - Unexpected errors
 */
export class InternalServerError extends ApplicationError {
  constructor(message: string = 'Internal server error') {
    super(500, message, 'INTERNAL_ERROR');
  }
}
