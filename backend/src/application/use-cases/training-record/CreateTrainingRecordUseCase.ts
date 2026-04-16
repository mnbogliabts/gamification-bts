import { v4 as uuidv4 } from 'uuid';
import { TrainingRecord } from '../../../domain/entities/TrainingRecord';
import { AuditLog, AuditAction } from '../../../domain/entities/AuditLog';
import { TrainingHours } from '../../../domain/value-objects/TrainingHours';
import { ITrainingRecordRepository } from '../../../domain/repositories/ITrainingRecordRepository';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { ValidationError } from '../../../shared/errors';

export interface CreateTrainingRecordDTO {
  userId: string;
  technologyId: string;
  title: string;
  description: string;
  hours: number;
  completedDate?: string;
  completionDate?: string;
}

export interface CreateTrainingRecordContext {
  performedByUserId: string;
  ipAddress?: string;
}

export class CreateTrainingRecordUseCase {
  constructor(
    private trainingRecordRepository: ITrainingRecordRepository,
    private auditLogRepository: IAuditLogRepository
  ) {}

  async execute(dto: CreateTrainingRecordDTO, context: CreateTrainingRecordContext): Promise<TrainingRecord> {
    // Validate required fields
    if (!dto.userId || dto.userId.trim().length === 0) {
      throw new ValidationError('User ID is required');
    }
    if (!dto.technologyId || dto.technologyId.trim().length === 0) {
      throw new ValidationError('Technology ID is required');
    }
    if (!dto.title || dto.title.trim().length === 0) {
      throw new ValidationError('Title is required');
    }
    if (!dto.description || dto.description.trim().length === 0) {
      throw new ValidationError('Description is required');
    }
    if (dto.hours === undefined || dto.hours === null) {
      throw new ValidationError('Hours is required');
    }

    // Create TrainingHours value object (validates range and decimal places)
    const trainingHours = new TrainingHours(dto.hours);

    // Create TrainingRecord entity
    const record = TrainingRecord.create({
      id: uuidv4(),
      userId: dto.userId.trim(),
      technologyId: dto.technologyId.trim(),
      title: dto.title,
      description: dto.description,
      hours: trainingHours,
      completedDate: dto.completedDate ? new Date(dto.completedDate) : null,
      completionDate: dto.completionDate ?? null,
    });

    // Persist via repository
    const createdRecord = await this.trainingRecordRepository.create(record);

    // Create audit log entry
    const auditLog = AuditLog.create({
      id: uuidv4(),
      userId: context.performedByUserId,
      action: AuditAction.CREATE,
      entityType: 'TrainingRecord',
      entityId: createdRecord.id,
      changes: {
        userId: dto.userId,
        technologyId: dto.technologyId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        hours: dto.hours,
      },
      ipAddress: context.ipAddress ?? null,
    });

    await this.auditLogRepository.create(auditLog);

    return createdRecord;
  }
}
