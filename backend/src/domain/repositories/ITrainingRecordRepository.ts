import { TrainingRecord } from '../entities/TrainingRecord';

export interface SearchCriteria {
  searchTerm?: string;
  technologyId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Repository interface for TrainingRecord entity
 * Requirements: 4.1, 5.4
 */
export interface ITrainingRecordRepository {
  create(record: TrainingRecord): Promise<TrainingRecord>;
  findById(id: string): Promise<TrainingRecord | null>;
  update(id: string, updates: Partial<Omit<TrainingRecord, 'id' | 'createdAt'>>): Promise<TrainingRecord>;
  delete(id: string): Promise<void>;
  findByUserId(userId: string): Promise<TrainingRecord[]>;
  search(criteria: SearchCriteria): Promise<TrainingRecord[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<TrainingRecord[]>;
}
