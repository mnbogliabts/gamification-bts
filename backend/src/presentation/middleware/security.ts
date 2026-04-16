import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

/**
 * Configure Helmet security headers middleware.
 * Requirements: 20.3
 */
export function createHelmetMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow loading cross-origin resources for OAuth
  });
}

/**
 * Configure CORS middleware with appropriate origins.
 * Requirements: 20.3
 */
export function createCorsMiddleware(options?: {
  allowedOrigins?: string[];
}) {
  const allowedOrigins = options?.allowedOrigins ?? [
    'http://localhost:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., server-to-server, curl)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // 24 hours preflight cache
  });
}

/**
 * Input sanitization middleware to prevent SQL injection and XSS attacks.
 * Recursively sanitizes string values in req.body, req.query, and req.params.
 * Requirements: 20.3
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query) as typeof req.query;
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params) as typeof req.params;
  }
  next();
}

/**
 * Recursively sanitize an object's string values.
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

/**
 * Sanitize a single string value.
 * - Strips common XSS patterns (script tags, event handlers, javascript: URIs)
 * - Escapes SQL-sensitive characters in a lightweight way
 */
function sanitizeString(input: string): string {
  let sanitized = input;

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handler attributes (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // Remove javascript: URIs
  sanitized = sanitized.replace(/javascript\s*:/gi, '');

  // Remove HTML tags that could be used for XSS
  sanitized = sanitized.replace(/<\/?(?:script|iframe|object|embed|form|input|button|textarea|select|style|link|meta)\b[^>]*>/gi, '');

  // Neutralize SQL injection patterns — escape single quotes by doubling them
  sanitized = sanitized.replace(/'/g, "''");

  return sanitized.trim();
}
