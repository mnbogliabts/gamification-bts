import { Email } from '../Email';
import * as fc from 'fast-check';

describe('Email Value Object', () => {
  describe('Valid emails', () => {
    it('should accept standard email format', () => {
      const email = new Email('user@example.com');
      expect(email.getValue()).toBe('user@example.com');
    });

    it('should accept email with subdomain', () => {
      const email = new Email('user@mail.example.com');
      expect(email.getValue()).toBe('user@mail.example.com');
    });

    it('should accept email with plus sign', () => {
      const email = new Email('user+tag@example.com');
      expect(email.getValue()).toBe('user+tag@example.com');
    });

    it('should accept email with dots in local part', () => {
      const email = new Email('first.last@example.com');
      expect(email.getValue()).toBe('first.last@example.com');
    });

    it('should accept email with numbers', () => {
      const email = new Email('user123@example456.com');
      expect(email.getValue()).toBe('user123@example456.com');
    });

    it('should accept email with hyphens in domain', () => {
      const email = new Email('user@my-company.com');
      expect(email.getValue()).toBe('user@my-company.com');
    });
  });

  describe('Email normalization', () => {
    it('should convert email to lowercase', () => {
      const email = new Email('User@Example.COM');
      expect(email.getValue()).toBe('user@example.com');
    });

    it('should convert mixed case email to lowercase', () => {
      const email = new Email('JohnDoe@BlueTRAILsoft.com');
      expect(email.getValue()).toBe('johndoe@bluetrailsoft.com');
    });
  });

  describe('Invalid emails', () => {
    it('should reject email without @ symbol', () => {
      expect(() => new Email('userexample.com')).toThrow('Invalid email format');
    });

    it('should reject email without domain', () => {
      expect(() => new Email('user@')).toThrow('Invalid email format');
    });

    it('should reject email without local part', () => {
      expect(() => new Email('@example.com')).toThrow('Invalid email format');
    });

    it('should reject email without TLD', () => {
      expect(() => new Email('user@example')).toThrow('Invalid email format');
    });

    it('should reject email with spaces', () => {
      expect(() => new Email('user name@example.com')).toThrow('Invalid email format');
    });

    it('should reject empty string', () => {
      expect(() => new Email('')).toThrow('Invalid email format');
    });

    it('should reject email with multiple @ symbols', () => {
      expect(() => new Email('user@@example.com')).toThrow('Invalid email format');
    });
  });

  describe('Domain extraction', () => {
    it('should extract domain from email', () => {
      const email = new Email('user@example.com');
      expect(email.getDomain()).toBe('example.com');
    });

    it('should extract subdomain correctly', () => {
      const email = new Email('user@mail.example.com');
      expect(email.getDomain()).toBe('mail.example.com');
    });

    it('should extract domain from bluetrailsoft email', () => {
      const email = new Email('admin@bluetrailsoft.com');
      expect(email.getDomain()).toBe('bluetrailsoft.com');
    });
  });

  describe('Value object behavior', () => {
    it('should support equality comparison', () => {
      const email1 = new Email('user@example.com');
      const email2 = new Email('USER@EXAMPLE.COM'); // Should be equal after normalization
      const email3 = new Email('other@example.com');

      expect(email1.equals(email2)).toBe(true);
      expect(email1.equals(email3)).toBe(false);
    });

    it('should convert to string', () => {
      const email = new Email('user@example.com');
      expect(email.toString()).toBe('user@example.com');
    });
  });

  // **Validates: Requirements 13.3**
  describe('Property 56: Email Format Validation', () => {
    it('should accept all valid email formats', () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (emailStr) => {
            const email = new Email(emailStr);
            expect(email.getValue()).toBe(emailStr.toLowerCase());
            expect(email.getDomain()).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid email formats', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // No @ symbol
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('@')),
            // Multiple @ symbols
            fc.string({ minLength: 1, maxLength: 20 }).chain(s1 =>
              fc.string({ minLength: 1, maxLength: 20 }).map(s2 => `${s1}@@${s2}`)
            ),
            // Missing local part
            fc.domain().map(d => `@${d}`),
            // Missing domain
            fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}@`),
            // Contains spaces
            fc.string({ minLength: 5, maxLength: 30 })
              .filter(s => s.includes(' ') && !s.includes('@'))
              .map(s => `${s}@example.com`)
          ),
          (invalidEmail) => {
            expect(() => new Email(invalidEmail)).toThrow('Invalid email format');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
