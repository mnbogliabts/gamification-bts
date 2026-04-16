/**
 * Email Value Object
 * 
 * Represents an email address with validation rules:
 * - Must match valid email format (local@domain)
 * - Stored in lowercase for consistency
 * - Provides domain extraction method
 * 
 * Immutable value object following DDD principles.
 */
export class Email {
  private readonly value: string;

  constructor(email: string) {
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Store in lowercase for consistency
    this.value = email.toLowerCase();
  }

  getValue(): string {
    return this.value;
  }

  getDomain(): string {
    return this.value.split('@')[1];
  }

  private isValidEmail(email: string): boolean {
    // RFC 5322 compliant email regex (simplified but robust)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
