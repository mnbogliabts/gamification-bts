import { TrainingRecordRepository } from '../TrainingRecordRepository';
import { TrainingRecord } from '../../../../domain/entities/TrainingRecord';
import { TrainingHours } from '../../../../domain/value-objects/TrainingHours';

// Mock the database pool
jest.mock('../../connection', () => ({
  getDatabasePool: jest.fn()
}));

import { getDatabasePool } from '../../connection';

describe('TrainingRecordRepository', () => {
  let repository: TrainingRecordRepository;
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: jest.fn()
    };

    (getDatabasePool as jest.Mock).mockReturnValue(mockPool);
    repository = new TrainingRecordRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should persist completionDate when provided', async () => {
      const record = TrainingRecord.create({
        id: 'rec-123',
        userId: 'user-1',
        technologyId: 'tech-1',
        title: 'React Training',
        description: 'Advanced React patterns',
        hours: new TrainingHours(5.0),
        completionDate: '2024-06-15',
      });

      const mockRow = {
        id: 'rec-123',
        user_id: 'user-1',
        technology_id: 'tech-1',
        title: 'React Training',
        description: 'Advanced React patterns',
        hours: '5.00',
        completed_date: null,
        completion_date: new Date('2024-06-15'),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await repository.create(record);

      expect(result).toBeDefined();
      expect(result.completionDate).toBe('2024-06-15');
      // Verify the query includes completion_date column
      const queryArg = mockPool.query.mock.calls[0][0];
      expect(queryArg).toContain('completion_date');
      // Verify the value was passed
      const valuesArg = mockPool.query.mock.calls[0][1];
      expect(valuesArg).toContain('2024-06-15');
    });

    it('should persist null completionDate', async () => {
      const record = TrainingRecord.create({
        id: 'rec-456',
        userId: 'user-1',
        technologyId: 'tech-1',
        title: 'Node.js Training',
        description: 'Backend development',
        hours: new TrainingHours(3.0),
      });

      const mockRow = {
        id: 'rec-456',
        user_id: 'user-1',
        technology_id: 'tech-1',
        title: 'Node.js Training',
        description: 'Backend development',
        hours: '3.00',
        completed_date: null,
        completion_date: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await repository.create(record);

      expect(result).toBeDefined();
      expect(result.completionDate).toBeNull();
    });
  });

  describe('findById', () => {
    it('should map completion_date from DB row to completionDate', async () => {
      const mockRow = {
        id: 'rec-123',
        user_id: 'user-1',
        technology_id: 'tech-1',
        title: 'React Training',
        description: 'Advanced React patterns',
        hours: '5.00',
        completed_date: null,
        completion_date: new Date('2024-06-15'),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await repository.findById('rec-123');

      expect(result).toBeDefined();
      expect(result?.completionDate).toBe('2024-06-15');
    });

    it('should return null completionDate when DB column is null', async () => {
      const mockRow = {
        id: 'rec-123',
        user_id: 'user-1',
        technology_id: 'tech-1',
        title: 'React Training',
        description: 'Advanced React patterns',
        hours: '5.00',
        completed_date: null,
        completion_date: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await repository.findById('rec-123');

      expect(result).toBeDefined();
      expect(result?.completionDate).toBeNull();
    });
  });

  describe('update', () => {
    it('should include completionDate in update query when provided', async () => {
      const mockRow = {
        id: 'rec-123',
        user_id: 'user-1',
        technology_id: 'tech-1',
        title: 'React Training',
        description: 'Advanced React patterns',
        hours: '5.00',
        completed_date: null,
        completion_date: new Date('2024-07-20'),
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await repository.update('rec-123', {
        completionDate: '2024-07-20',
      } as any);

      expect(result).toBeDefined();
      expect(result.completionDate).toBe('2024-07-20');
      const queryArg = mockPool.query.mock.calls[0][0];
      expect(queryArg).toContain('completion_date');
    });
  });
});
