import { TrainingFile } from '../entities/TrainingFile';

/**
 * Repository interface for TrainingFile entity
 * Requirements: 5.4
 */
export interface ITrainingFileRepository {
  create(file: TrainingFile): Promise<TrainingFile>;
  findById(id: string): Promise<TrainingFile | null>;
  findByTrainingRecordId(trainingRecordId: string): Promise<TrainingFile[]>;
  delete(id: string): Promise<void>;
}
