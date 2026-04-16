import { TrainingRecord } from '../../../domain/entities/TrainingRecord';
import { UserRole } from '../../../domain/entities/User';
import { ITrainingRecordRepository } from '../../../domain/repositories/ITrainingRecordRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { NotFoundError, AuthorizationError } from '../../../shared/errors';

export interface TrainingRecordResponseDTO {
  id: string;
  userId: string;
  technologyId: string;
  title: string;
  description: string;
  hours: number;
  completedDate: string | null;
  completionDate: string | null;
  createdAt: string;
  updatedAt: string;
  files: any[];
  user?: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
  };
}

export interface GetTrainingRecordContext {
  requestingUserId: string;
  requestingUserRole: UserRole;
}

export class GetTrainingRecordUseCase {
  constructor(
    private trainingRecordRepository: ITrainingRecordRepository,
    private userRepository?: IUserRepository
  ) {}

  async execute(recordId: string, context: GetTrainingRecordContext): Promise<TrainingRecordResponseDTO> {
    // Find record
    const record = await this.trainingRecordRepository.findById(recordId);
    if (!record) {
      throw new NotFoundError('Training record');
    }

    // Authorization check: admins can view any record, employees can only view their own
    if (context.requestingUserRole !== UserRole.ADMIN && record.userId !== context.requestingUserId) {
      throw new AuthorizationError('You do not have permission to view this training record');
    }

    const json = record.toJSON();
    const response: TrainingRecordResponseDTO = {
      ...json,
      completionDate: record.completionDate ?? null,
    };

    // Enrich with user info if userRepository is available
    if (this.userRepository) {
      const user = await this.userRepository.findById(record.userId);
      if (user) {
        response.user = {
          id: user.id,
          username: user.username,
          email: user.email.getValue(),
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.getDisplayName(),
        };
      }
    }

    return response;
  }
}
