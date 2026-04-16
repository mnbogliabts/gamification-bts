import { TrainingRecord } from '../../../domain/entities/TrainingRecord';
import { UserRole } from '../../../domain/entities/User';
import { ITrainingRecordRepository, SearchCriteria } from '../../../domain/repositories/ITrainingRecordRepository';
import { ValidationError } from '../../../shared/errors';

export interface SearchTrainingRecordsDTO {
  searchTerm?: string;
  technologyId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface SearchTrainingRecordsContext {
  requestingUserId: string;
  requestingUserRole: UserRole;
}

export class SearchTrainingRecordsUseCase {
  constructor(
    private trainingRecordRepository: ITrainingRecordRepository
  ) {}

  async execute(dto: SearchTrainingRecordsDTO, context: SearchTrainingRecordsContext): Promise<TrainingRecord[]> {
    // Validate date range if both dates provided
    if (dto.startDate && dto.endDate && dto.startDate > dto.endDate) {
      throw new ValidationError('Start date must be before end date');
    }

    // Build search criteria
    const criteria: SearchCriteria = {
      searchTerm: dto.searchTerm,
      technologyId: dto.technologyId,
      startDate: dto.startDate,
      endDate: dto.endDate,
    };

    // Employees can only search their own records
    if (context.requestingUserRole === UserRole.EMPLOYEE) {
      criteria.userId = context.requestingUserId;
    } else {
      criteria.userId = dto.userId;
    }

    return this.trainingRecordRepository.search(criteria);
  }
}
