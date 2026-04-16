import { TrainingRecord } from '../entities/TrainingRecord';
import { DateRange } from '../value-objects/DateRange';

export interface TechnologySummary {
  technologyId: string;
  technologyName: string;
  totalHours: number;
  recordCount: number;
  employeeCount: number;
}

export interface EmployeeRanking {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  totalHours: number;
  recordCount: number;
  rank: number;
}

export class AnalyticsEngine {
  /**
   * Calculate total training hours across all records
   * Validates: Requirements 8.3
   */
  calculateTotalHours(records: TrainingRecord[]): number {
    if (!records || records.length === 0) {
      return 0;
    }

    return records.reduce((total, record) => total + record.hours.getValue(), 0);
  }

  /**
   * Group training records by technology and calculate aggregates
   * Validates: Requirements 8.4, 10.1, 10.2
   */
  groupByTechnology(
    records: TrainingRecord[],
    technologyMap: Map<string, { name: string; category: string }>
  ): TechnologySummary[] {
    if (!records || records.length === 0) {
      return [];
    }

    const technologyGroups = new Map<string, {
      totalHours: number;
      recordCount: number;
      userIds: Set<string>;
    }>();

    // Group records by technology
    for (const record of records) {
      const existing = technologyGroups.get(record.technologyId);
      const hours = record.hours.getValue();
      
      if (existing) {
        existing.totalHours += hours;
        existing.recordCount += 1;
        existing.userIds.add(record.userId);
      } else {
        technologyGroups.set(record.technologyId, {
          totalHours: hours,
          recordCount: 1,
          userIds: new Set([record.userId]),
        });
      }
    }

    // Convert to array of summaries
    const summaries: TechnologySummary[] = [];
    for (const [technologyId, data] of technologyGroups.entries()) {
      const technology = technologyMap.get(technologyId);
      summaries.push({
        technologyId,
        technologyName: technology?.name || 'Unknown',
        totalHours: data.totalHours,
        recordCount: data.recordCount,
        employeeCount: data.userIds.size,
      });
    }

    // Sort by total hours descending
    return summaries.sort((a, b) => b.totalHours - a.totalHours);
  }

  /**
   * Rank employees by total training hours
   * Validates: Requirements 9.1, 9.5
   */
  rankEmployees(
    records: TrainingRecord[],
    userMap: Map<string, { username: string; displayName: string; email: string }>
  ): EmployeeRanking[] {
    if (!records || records.length === 0) {
      return [];
    }

    // Group records by user
    const userGroups = new Map<string, {
      totalHours: number;
      recordCount: number;
    }>();

    for (const record of records) {
      const existing = userGroups.get(record.userId);
      const hours = record.hours.getValue();
      
      if (existing) {
        existing.totalHours += hours;
        existing.recordCount += 1;
      } else {
        userGroups.set(record.userId, {
          totalHours: hours,
          recordCount: 1,
        });
      }
    }

    // Convert to array and sort by total hours descending
    const rankings: Array<{
      userId: string;
      totalHours: number;
      recordCount: number;
    }> = [];

    for (const [userId, data] of userGroups.entries()) {
      rankings.push({
        userId,
        totalHours: data.totalHours,
        recordCount: data.recordCount,
      });
    }

    rankings.sort((a, b) => b.totalHours - a.totalHours);

    // Assign ranks (handle ties)
    const result: EmployeeRanking[] = [];
    let currentRank = 1;
    let previousHours = -1;

    for (let i = 0; i < rankings.length; i++) {
      const ranking = rankings[i];
      
      // If hours are different from previous, update rank
      if (ranking.totalHours !== previousHours) {
        currentRank = i + 1;
        previousHours = ranking.totalHours;
      }

      const user = userMap.get(ranking.userId);
      result.push({
        userId: ranking.userId,
        username: user?.username || 'Unknown',
        displayName: user?.displayName || user?.username || 'Unknown',
        email: user?.email || 'Unknown',
        totalHours: ranking.totalHours,
        recordCount: ranking.recordCount,
        rank: currentRank,
      });
    }

    return result;
  }

  /**
   * Filter training records by date range
   * Validates: Requirements 8.2, 9.2, 10.5
   */
  filterByDateRange(records: TrainingRecord[], dateRange: DateRange): TrainingRecord[] {
    if (!records || records.length === 0) {
      return [];
    }

    return records.filter(record => dateRange.contains(record.createdAt));
  }

  /**
   * Calculate hours per technology for a specific user
   * Validates: Requirements 7.2, 7.3
   */
  calculateUserHoursByTechnology(
    records: TrainingRecord[],
    userId: string,
    technologyMap: Map<string, { name: string; category: string }>
  ): TechnologySummary[] {
    const userRecords = records.filter(record => record.userId === userId);
    return this.groupByTechnology(userRecords, technologyMap);
  }
}
