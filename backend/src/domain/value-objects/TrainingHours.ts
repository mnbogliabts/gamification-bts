/**
 * TrainingHours Value Object
 * 
 * Represents training hours with validation rules:
 * - Must be between 0.5 and 1000 (inclusive)
 * - Must have at most 2 decimal places
 * 
 * Immutable value object following DDD principles.
 */
export class TrainingHours {
  private readonly value: number;

  constructor(hours: number) {
    if (hours < 0.5 || hours > 1000) {
      throw new Error('Training hours must be between 0.5 and 1000');
    }

    if (!this.hasAtMostTwoDecimalPlaces(hours)) {
      throw new Error('Training hours must have at most 2 decimal places');
    }

    this.value = hours;
  }

  getValue(): number {
    return this.value;
  }

  private hasAtMostTwoDecimalPlaces(hours: number): boolean {
    // Multiply by 100 and check if it's an integer
    const multiplied = hours * 100;
    // Use a tolerance of 1e-10 to account for floating point precision issues
    return Math.abs(multiplied - Math.round(multiplied)) < 1e-10;
  }

  equals(other: TrainingHours): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value.toString();
  }
}
