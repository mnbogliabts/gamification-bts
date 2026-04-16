import { AnalyticsEngine } from '../AnalyticsEngine';
import { TrainingRecord } from '../../entities/TrainingRecord';
import { DateRange } from '../../value-objects/DateRange';
import { TrainingHours } from '../../value-objects/TrainingHours';

describe('AnalyticsEngine', () => {
  let analyticsEngine: AnalyticsEngine;
  let sampleRecords: TrainingRecord[];
  let technologyMap: Map<string, { name: string; category: string }>;
  let userMap: Map<string, { username: string; displayName: string; email: string }>;

  beforeEach(() => {
    analyticsEngine = new AnalyticsEngine();

    technologyMap = new Map([
      ['tech-1', { name: 'JavaScript', category: 'Programming' }],
      ['tech-2', { name: 'React', category: 'Frontend' }],
      ['tech-3', { name: 'Node.js', category: 'Backend' }],
    ]);

    userMap = new Map([
      ['user-1', { username: 'alice', displayName: 'alice', email: 'alice@bluetrailsoft.com' }],
      ['user-2', { username: 'bob', displayName: 'bob', email: 'bob@bluetrailsoft.com' }],
      ['user-3', { username: 'charlie', displayName: 'charlie', email: 'charlie@bluetrailsoft.com' }],
    ]);

    sampleRecords = [
      TrainingRecord.create({
        id: 'record-1',
        userId: 'user-1',
        technologyId: 'tech-1',
        title: 'JS Basics',
        description: 'Learning JavaScript',
        hours: new TrainingHours(10.5),
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      }),
      TrainingRecord.create({
        id: 'record-2',
        userId: 'user-1',
        technologyId: 'tech-2',
        title: 'React Course',
        description: 'Learning React',
        hours: new TrainingHours(15.0),
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
      }),
      TrainingRecord.create({
        id: 'record-3',
        userId: 'user-2',
        technologyId: 'tech-1',
        title: 'Advanced JS',
        description: 'Advanced JavaScript',
        hours: new TrainingHours(8.0),
        createdAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-01-25'),
      }),
      TrainingRecord.create({
        id: 'record-4',
        userId: 'user-2',
        technologyId: 'tech-3',
        title: 'Node.js Basics',
        description: 'Learning Node.js',
        hours: new TrainingHours(12.5),
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      }),
      TrainingRecord.create({
        id: 'record-5',
        userId: 'user-3',
        technologyId: 'tech-1',
        title: 'JS Patterns',
        description: 'Design patterns in JS',
        hours: new TrainingHours(6.0),
        createdAt: new Date('2024-02-05'),
        updatedAt: new Date('2024-02-05'),
      }),
    ];
  });

  describe('calculateTotalHours', () => {
    it('should calculate total hours across all records', () => {
      const total = analyticsEngine.calculateTotalHours(sampleRecords);
      expect(total).toBe(52.0); // 10.5 + 15 + 8 + 12.5 + 6
    });

    it('should return 0 for empty array', () => {
      const total = analyticsEngine.calculateTotalHours([]);
      expect(total).toBe(0);
    });

    it('should return 0 for null input', () => {
      const total = analyticsEngine.calculateTotalHours(null as any);
      expect(total).toBe(0);
    });

    it('should handle single record', () => {
      const total = analyticsEngine.calculateTotalHours([sampleRecords[0]]);
      expect(total).toBe(10.5);
    });

    it('should handle decimal hours correctly', () => {
      const records = [
        TrainingRecord.create({
          id: 'r1',
          userId: 'u1',
          technologyId: 't1',
          title: 'Test',
          description: 'Test',
          hours: new TrainingHours(5.25),
        }),
        TrainingRecord.create({
          id: 'r2',
          userId: 'u1',
          technologyId: 't1',
          title: 'Test',
          description: 'Test',
          hours: new TrainingHours(3.75),
        }),
      ];
      const total = analyticsEngine.calculateTotalHours(records);
      expect(total).toBe(9.0);
    });
  });

  describe('groupByTechnology', () => {
    it('should group records by technology and calculate aggregates', () => {
      const summaries = analyticsEngine.groupByTechnology(sampleRecords, technologyMap);

      expect(summaries).toHaveLength(3);

      const jsSummary = summaries.find(s => s.technologyId === 'tech-1');
      expect(jsSummary).toBeDefined();
      expect(jsSummary?.technologyName).toBe('JavaScript');
      expect(jsSummary?.totalHours).toBe(24.5); // 10.5 + 8 + 6
      expect(jsSummary?.recordCount).toBe(3);
      expect(jsSummary?.employeeCount).toBe(3); // user-1, user-2, user-3
    });

    it('should sort technologies by total hours descending', () => {
      const summaries = analyticsEngine.groupByTechnology(sampleRecords, technologyMap);

      expect(summaries[0].technologyId).toBe('tech-1'); // 24.5 hours
      expect(summaries[1].technologyId).toBe('tech-2'); // 15 hours
      expect(summaries[2].technologyId).toBe('tech-3'); // 12.5 hours
    });

    it('should count unique employees per technology', () => {
      const summaries = analyticsEngine.groupByTechnology(sampleRecords, technologyMap);

      const jsSummary = summaries.find(s => s.technologyId === 'tech-1');
      expect(jsSummary?.employeeCount).toBe(3);

      const reactSummary = summaries.find(s => s.technologyId === 'tech-2');
      expect(reactSummary?.employeeCount).toBe(1);
    });

    it('should return empty array for empty records', () => {
      const summaries = analyticsEngine.groupByTechnology([], technologyMap);
      expect(summaries).toEqual([]);
    });

    it('should handle unknown technology gracefully', () => {
      const records = [
        TrainingRecord.create({
          id: 'r1',
          userId: 'u1',
          technologyId: 'unknown-tech',
          title: 'Test',
          description: 'Test',
          hours: new TrainingHours(5.0),
        }),
      ];
      const summaries = analyticsEngine.groupByTechnology(records, technologyMap);

      expect(summaries).toHaveLength(1);
      expect(summaries[0].technologyName).toBe('Unknown');
    });
  });

  describe('rankEmployees', () => {
    it('should rank employees by total hours descending', () => {
      const rankings = analyticsEngine.rankEmployees(sampleRecords, userMap);

      expect(rankings).toHaveLength(3);
      expect(rankings[0].userId).toBe('user-1'); // 25.5 hours
      expect(rankings[0].rank).toBe(1);
      expect(rankings[1].userId).toBe('user-2'); // 20.5 hours
      expect(rankings[1].rank).toBe(2);
      expect(rankings[2].userId).toBe('user-3'); // 6 hours
      expect(rankings[2].rank).toBe(3);
    });

    it('should include user information in rankings', () => {
      const rankings = analyticsEngine.rankEmployees(sampleRecords, userMap);

      expect(rankings[0].username).toBe('alice');
      expect(rankings[0].displayName).toBe('alice');
      expect(rankings[0].email).toBe('alice@bluetrailsoft.com');
      expect(rankings[0].totalHours).toBe(25.5);
      expect(rankings[0].recordCount).toBe(2);
    });

    it('should handle ties correctly with same rank', () => {
      const records = [
        TrainingRecord.create({
          id: 'r1',
          userId: 'user-1',
          technologyId: 't1',
          title: 'Test',
          description: 'Test',
          hours: new TrainingHours(10.0),
        }),
        TrainingRecord.create({
          id: 'r2',
          userId: 'user-2',
          technologyId: 't1',
          title: 'Test',
          description: 'Test',
          hours: new TrainingHours(10.0),
        }),
        TrainingRecord.create({
          id: 'r3',
          userId: 'user-3',
          technologyId: 't1',
          title: 'Test',
          description: 'Test',
          hours: new TrainingHours(5.0),
        }),
      ];

      const rankings = analyticsEngine.rankEmployees(records, userMap);

      expect(rankings[0].rank).toBe(1);
      expect(rankings[1].rank).toBe(1); // Same rank as first
      expect(rankings[2].rank).toBe(3); // Skips rank 2
    });

    it('should return empty array for empty records', () => {
      const rankings = analyticsEngine.rankEmployees([], userMap);
      expect(rankings).toEqual([]);
    });

    it('should handle unknown users gracefully', () => {
      const records = [
        TrainingRecord.create({
          id: 'r1',
          userId: 'unknown-user',
          technologyId: 't1',
          title: 'Test',
          description: 'Test',
          hours: new TrainingHours(5.0),
        }),
      ];
      const rankings = analyticsEngine.rankEmployees(records, userMap);

      expect(rankings).toHaveLength(1);
      expect(rankings[0].username).toBe('Unknown');
      expect(rankings[0].displayName).toBe('Unknown');
      expect(rankings[0].email).toBe('Unknown');
    });

    it('should aggregate multiple records per user', () => {
      const rankings = analyticsEngine.rankEmployees(sampleRecords, userMap);

      const aliceRanking = rankings.find(r => r.userId === 'user-1');
      expect(aliceRanking?.totalHours).toBe(25.5); // 10.5 + 15
      expect(aliceRanking?.recordCount).toBe(2);
    });

    it('should use displayName from userMap when provided', () => {
      const userMapWithNames = new Map([
        ['user-1', { username: 'alice', displayName: 'Alice Smith', email: 'alice@bluetrailsoft.com' }],
        ['user-2', { username: 'bob', displayName: 'Bob Jones', email: 'bob@bluetrailsoft.com' }],
      ]);

      const records = [
        TrainingRecord.create({
          id: 'r1',
          userId: 'user-1',
          technologyId: 't1',
          title: 'Test',
          description: 'Test',
          hours: new TrainingHours(10.0),
        }),
        TrainingRecord.create({
          id: 'r2',
          userId: 'user-2',
          technologyId: 't1',
          title: 'Test',
          description: 'Test',
          hours: new TrainingHours(5.0),
        }),
      ];

      const rankings = analyticsEngine.rankEmployees(records, userMapWithNames);

      expect(rankings[0].displayName).toBe('Alice Smith');
      expect(rankings[1].displayName).toBe('Bob Jones');
    });
  });

  describe('filterByDateRange', () => {
    it('should filter records within date range', () => {
      const dateRange = new DateRange(
        new Date('2024-01-20'),
        new Date('2024-02-01')
      );

      const filtered = analyticsEngine.filterByDateRange(sampleRecords, dateRange);

      expect(filtered).toHaveLength(3);
      expect(filtered.map(r => r.id)).toEqual(['record-2', 'record-3', 'record-4']);
    });

    it('should include records on boundary dates', () => {
      const dateRange = new DateRange(
        new Date('2024-01-15'),
        new Date('2024-01-15')
      );

      const filtered = analyticsEngine.filterByDateRange(sampleRecords, dateRange);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('record-1');
    });

    it('should return empty array when no records match', () => {
      const dateRange = new DateRange(
        new Date('2024-03-01'),
        new Date('2024-03-31')
      );

      const filtered = analyticsEngine.filterByDateRange(sampleRecords, dateRange);

      expect(filtered).toEqual([]);
    });

    it('should return empty array for empty records', () => {
      const dateRange = new DateRange(
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      const filtered = analyticsEngine.filterByDateRange([], dateRange);

      expect(filtered).toEqual([]);
    });
  });

  describe('calculateUserHoursByTechnology', () => {
    it('should calculate hours by technology for specific user', () => {
      const summaries = analyticsEngine.calculateUserHoursByTechnology(
        sampleRecords,
        'user-1',
        technologyMap
      );

      expect(summaries).toHaveLength(2);

      const reactSummary = summaries.find(s => s.technologyId === 'tech-2');
      expect(reactSummary?.totalHours).toBe(15.0);

      const jsSummary = summaries.find(s => s.technologyId === 'tech-1');
      expect(jsSummary?.totalHours).toBe(10.5);
    });

    it('should return empty array for user with no records', () => {
      const summaries = analyticsEngine.calculateUserHoursByTechnology(
        sampleRecords,
        'non-existent-user',
        technologyMap
      );

      expect(summaries).toEqual([]);
    });

    it('should only include records for specified user', () => {
      const summaries = analyticsEngine.calculateUserHoursByTechnology(
        sampleRecords,
        'user-2',
        technologyMap
      );

      expect(summaries).toHaveLength(2);
      expect(summaries.every(s => s.employeeCount === 1)).toBe(true);
    });
  });
});
