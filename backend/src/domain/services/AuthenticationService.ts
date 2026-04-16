import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, UserRole, AuthProvider } from '../entities/User';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  authProvider: AuthProvider;
  iat: number;
  exp: number;
}

export class AuthenticationService {
  private readonly jwtSecret: string;
  private readonly tokenExpirationHours: number = 24;
  private readonly bcryptCostFactor: number = 10;

  constructor(jwtSecret: string) {
    if (!jwtSecret) {
      throw new Error('JWT secret is required');
    }
    this.jwtSecret = jwtSecret;
  }

  /**
   * Hash a password using bcrypt with cost factor of 10
   * Validates: Requirements 1.8, 20.1
   */
  async hashPassword(password: string): Promise<string> {
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty');
    }
    return bcrypt.hash(password, this.bcryptCostFactor);
  }

  /**
   * Authenticate user with username and password
   * Validates: Requirements 1.1, 1.2
   */
  async authenticate(
    password: string,
    passwordHash: string
  ): Promise<boolean> {
    if (!password || !passwordHash) {
      return false;
    }
    return bcrypt.compare(password, passwordHash);
  }

  /**
   * Generate JWT token for authenticated user
   * Validates: Requirements 1.1
   */
  generateJWT(user: User): string {
    const now = Math.floor(Date.now() / 1000);
    const expirationTime = now + this.tokenExpirationHours * 60 * 60;

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email.getValue(),
      role: user.role,
      authProvider: user.authProvider,
      iat: now,
      exp: expirationTime,
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  /**
   * Validate and decode JWT token
   * Validates: Requirements 1.7
   */
  validateJWT(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp < now) {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh JWT token for authenticated user
   * Generates a new token with extended expiration
   * Validates: Requirements 1.7
   */
  refreshJWT(user: User): string {
    return this.generateJWT(user);
  }

  /**
   * Hash a JWT token for storage in blacklist
   * Uses SHA-256 to create a consistent hash for token lookup
   * Validates: Requirements 1.9
   */
  hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validate OAuth email domain
   * Validates: Requirements 1.4, 1.5
   */
  validateOAuthDomain(email: string, allowedDomain: string = 'bluetrailsoft.com'): boolean {
    if (!email || !email.includes('@')) {
      return false;
    }
    const domain = email.split('@')[1].toLowerCase();
    return domain === allowedDomain.toLowerCase();
  }
}
