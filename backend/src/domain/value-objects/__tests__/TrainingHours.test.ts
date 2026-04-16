import { TrainingHours } from '../TrainingHours';
import * as fc from 'fast-check';

describe('TrainingHours Value Object', () => {
  describe('Valid hours', () => {
    it('should accept minimum valid hours (0.5)', () => {
      const hours = new TrainingHours(0.5);
      expect(hours.getValue()).toBe(0.5);
    });

    it('should accept maximum valid hours (1000)', () => {
      const hours = new TrainingHours(1000);
      expect(hours.getValue()).toBe(1000);
    });

    it('should accept hours with 1 decimal place', () => {
      const hours = new TrainingHours(5.5);
      expect(hours.getValue()).toBe(5.5);
    });

    it('should accept hours with 2 decimal places', () => {
      const hours = new TrainingHours(8.75);
      expect(hours.getValue()).toBe(8.75);
    });

    it('should accept whole numbers', () => {
      const hours = new TrainingHours(10);
      expect(hours.getValue()).toBe(10);
    });
  });

  describe('Invalid hours - range validation', () => {
    it('should reject hours below 0.5', () => {
      expect(() => new TrainingHours(0.4)).toThrow(
        'Training hours must be between 0.5 and 1000'
      );
    });

    it('should reject hours above 1000', () => {
      expect(() => new TrainingHours(1000.1)).toThrow(
        'Training hours must be between 0.5 and 1000'
      );
    });

    it('should reject negative hours', () => {
      expect(() => new TrainingHours(-5)).toThrow(
        'Training hours must be between 0.5 and 1000'
      );
    });

    it('should reject zero hours', () => {
      expect(() => new TrainingHours(0)).toThrow(
        'Training hours must be between 0.5 and 1000'
      );
    });
  });

  describe('Invalid hours - decimal places validation', () => {
    it('should reject hours with 3 decimal places', () => {
      expect(() => new TrainingHours(5.555)).toThrow(
        'Training hours must have at most 2 decimal places'
      );
    });

    it('should reject hours with 4 decimal places', () => {
      expect(() => new TrainingHours(10.1234)).toThrow(
        'Training hours must have at most 2 decimal places'
      );
    });

    it('should reject hours with many decimal places', () => {
      expect(() => new TrainingHours(7.123456789)).toThrow(
        'Training hours must have at most 2 decimal places'
      );
    });
  });

  describe('Value object behavior', () => {
    it('should support equality comparison', () => {
      const hours1 = new TrainingHours(5.5);
      const hours2 = new TrainingHours(5.5);
      const hours3 = new TrainingHours(6.0);

      expect(hours1.equals(hours2)).toBe(true);
      expect(hours1.equals(hours3)).toBe(false);
    });

    it('should convert to string', () => {
      const hours = new TrainingHours(8.75);
      expect(hours.toString()).toBe('8.75');
    });
  });

  // **Validates: Requirements 4.2, 13.2**
  describe('Property 19: Training Hours Range Validation', () => {
    it('should accept all valid hours (0.5-1000, max 2 decimals)', () => {
      fc.assert(
        fc.property(
          // Generate valid hours: 0.5 to 1000 with at most 2 decimal places
          fc.integer({ min: 50, max: 100000 }).map(n => {
            const value = n / 100;
            // Round to 2 decimal places to avoid floating point precision issues
            return Math.round(value * 100) / 100;
          }),
          (hours) => {
            const trainingHours = new TrainingHours(hours);
            expect(trainingHours.getValue()).toBe(hours);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject all invalid hours (out of range)', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Below minimum: 0 to 0.49
            fc.double({ min: 0, max: 0.49, noNaN: true }),
            // Above maximum: 1000.01 to 10000
            fc.double({ min: 1000.01, max: 10000, noNaN: true })
          ),
          (hours) => {
            expect(() => new TrainingHours(hours)).toThrow(
              'Training hours must be between 0.5 and 1000'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject all invalid hours (too many decimal places)', () => {
      fc.assert(
        fc.property(
          // Generate numbers with 3+ decimal places in valid range
          fc.integer({ min: 50, max: 99900 }).chain(base =>
            fc.integer({ min: 1, max: 9 }).map(extra => {
              // Add a third decimal place that's not zero
              // Keep within valid range (0.5 to 999.99)
              return (base / 100) + (extra / 1000);
            })
          ),
          (hours) => {
            expect(() => new TrainingHours(hours)).toThrow(
              'Training hours must have at most 2 decimal places'
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
