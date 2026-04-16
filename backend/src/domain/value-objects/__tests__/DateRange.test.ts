import { DateRange } from '../DateRange';
import * as fc from 'fast-check';

describe('DateRange Value Object', () => {
  describe('Valid date ranges', () => {
    it('should accept valid date range with start before end', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const range = new DateRange(start, end);

      expect(range.getStartDate()).toEqual(start);
      expect(range.getEndDate()).toEqual(end);
    });

    it('should accept date range with same start and end date', () => {
      const date = new Date('2024-06-15');
      const range = new DateRange(date, date);

      expect(range.getStartDate()).toEqual(date);
      expect(range.getEndDate()).toEqual(date);
    });

    it('should accept date range spanning one day', () => {
      const start = new Date('2024-01-01T00:00:00');
      const end = new Date('2024-01-01T23:59:59');
      const range = new DateRange(start, end);

      expect(range.getStartDate()).toEqual(start);
      expect(range.getEndDate()).toEqual(end);
    });

    it('should accept date range spanning multiple years', () => {
      const start = new Date('2020-01-01');
      const end = new Date('2024-12-31');
      const range = new DateRange(start, end);

      expect(range.getStartDate()).toEqual(start);
      expect(range.getEndDate()).toEqual(end);
    });
  });

  describe('Invalid date ranges', () => {
    it('should reject date range with start after end', () => {
      const start = new Date('2024-12-31');
      const end = new Date('2024-01-01');

      expect(() => new DateRange(start, end)).toThrow(
        'Start date must be before or equal to end date'
      );
    });

    it('should reject date range with start significantly after end', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2024-01-01');

      expect(() => new DateRange(start, end)).toThrow(
        'Start date must be before or equal to end date'
      );
    });
  });

  describe('Contains method', () => {
    it('should return true for date within range', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const range = new DateRange(start, end);
      const testDate = new Date('2024-06-15');

      expect(range.contains(testDate)).toBe(true);
    });

    it('should return true for date equal to start date', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const range = new DateRange(start, end);

      expect(range.contains(start)).toBe(true);
    });

    it('should return true for date equal to end date', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const range = new DateRange(start, end);

      expect(range.contains(end)).toBe(true);
    });

    it('should return false for date before start', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const range = new DateRange(start, end);
      const testDate = new Date('2023-12-31');

      expect(range.contains(testDate)).toBe(false);
    });

    it('should return false for date after end', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const range = new DateRange(start, end);
      const testDate = new Date('2025-01-01');

      expect(range.contains(testDate)).toBe(false);
    });

    it('should handle dates with time components', () => {
      const start = new Date('2024-01-01T00:00:00');
      const end = new Date('2024-01-01T23:59:59');
      const range = new DateRange(start, end);
      const testDate = new Date('2024-01-01T12:30:00');

      expect(range.contains(testDate)).toBe(true);
    });
  });

  describe('Value object behavior', () => {
    it('should be immutable - dates are copied', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const range = new DateRange(start, end);

      // Modify original dates
      start.setFullYear(2025);
      end.setFullYear(2025);

      // Range should still have original dates
      expect(range.getStartDate().getFullYear()).toBe(2024);
      expect(range.getEndDate().getFullYear()).toBe(2024);
    });

    it('should return new Date objects from getters', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const range = new DateRange(start, end);

      const retrievedStart = range.getStartDate();
      retrievedStart.setFullYear(2025);

      // Original range should be unchanged
      expect(range.getStartDate().getFullYear()).toBe(2024);
    });

    it('should support equality comparison', () => {
      const start1 = new Date('2024-01-01');
      const end1 = new Date('2024-12-31');
      const range1 = new DateRange(start1, end1);

      const start2 = new Date('2024-01-01');
      const end2 = new Date('2024-12-31');
      const range2 = new DateRange(start2, end2);

      const start3 = new Date('2024-02-01');
      const end3 = new Date('2024-12-31');
      const range3 = new DateRange(start3, end3);

      expect(range1.equals(range2)).toBe(true);
      expect(range1.equals(range3)).toBe(false);
    });

    it('should convert to string with ISO format', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-12-31T23:59:59Z');
      const range = new DateRange(start, end);

      const str = range.toString();
      expect(str).toContain('2024-01-01');
      expect(str).toContain('2024-12-31');
      expect(str).toContain(' to ');
    });
  });

  // **Validates: Requirements 13.4**
  describe('Property 57: ISO 8601 Date Validation', () => {
    it('should accept all valid ISO 8601 dates', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') }),
          fc.date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') }),
          (date1, date2) => {
            // Ensure start <= end
            const start = date1 <= date2 ? date1 : date2;
            const end = date1 <= date2 ? date2 : date1;

            const range = new DateRange(start, end);
            
            // Verify dates are stored correctly
            expect(range.getStartDate().getTime()).toBe(start.getTime());
            expect(range.getEndDate().getTime()).toBe(end.getTime());
            
            // Verify ISO 8601 format in toString
            const str = range.toString();
            expect(str).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse and accept ISO 8601 date strings', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') }),
          fc.date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') }),
          (date1, date2) => {
            // Ensure start <= end
            const start = date1 <= date2 ? date1 : date2;
            const end = date1 <= date2 ? date2 : date1;

            // Convert to ISO strings and parse back
            const startISO = start.toISOString();
            const endISO = end.toISOString();
            
            const parsedStart = new Date(startISO);
            const parsedEnd = new Date(endISO);
            
            // Should be able to create DateRange from parsed dates
            const range = new DateRange(parsedStart, parsedEnd);
            expect(range.getStartDate().getTime()).toBe(parsedStart.getTime());
            expect(range.getEndDate().getTime()).toBe(parsedEnd.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle various ISO 8601 formats', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1970, max: 2100 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }), // Use 28 to avoid invalid dates
          (year, month, day) => {
            // Test YYYY-MM-DD format
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const date = new Date(dateStr);
            
            // Should be valid if not NaN
            if (!isNaN(date.getTime())) {
              const range = new DateRange(date, date);
              expect(range.getStartDate()).toEqual(date);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
