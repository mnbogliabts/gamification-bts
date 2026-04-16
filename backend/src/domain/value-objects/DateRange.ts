/**
 * DateRange Value Object
 * 
 * Represents a date range with validation rules:
 * - Start date must be before or equal to end date
 * - Provides method to check if a date falls within the range
 * 
 * Immutable value object following DDD principles.
 */
export class DateRange {
  private readonly startDate: Date;
  private readonly endDate: Date;

  constructor(startDate: Date, endDate: Date) {
    if (startDate > endDate) {
      throw new Error('Start date must be before or equal to end date');
    }

    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
  }

  getStartDate(): Date {
    return new Date(this.startDate);
  }

  getEndDate(): Date {
    return new Date(this.endDate);
  }

  contains(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  equals(other: DateRange): boolean {
    return (
      this.startDate.getTime() === other.startDate.getTime() &&
      this.endDate.getTime() === other.endDate.getTime()
    );
  }

  toString(): string {
    return `${this.startDate.toISOString()} to ${this.endDate.toISOString()}`;
  }
}
