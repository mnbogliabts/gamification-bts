import { v4 as uuidv4 } from 'uuid';
import { TrainingRecord } from '../../../domain/entities/TrainingRecord';
import { AuditLog, AuditAction } from '../../../domain/entities/AuditLog';
import { TrainingHours } from '../../../domain/value-objects/TrainingHours';
import { ITrainingRecordRepository } from '../../../domain/repositories/ITrainingRecordRepository';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { NotFoundError } from '../../../shared/errors';

export interface UpdateTrainingRecordDTO {
  technologyId?: string;
  title?: string;
  description?: string;
  hours?: number;
  completionDate?: string | null;
}

export interface UpdateTrainingRecordContext {
  performedByUserId: string;
  ipAddress?: string;
}

export class UpdateTrainingRecordUseCase {
  constructor(
    private trainingRecordRepository: ITrainingRecordRepository,
    private auditLogRepository: IAuditLogRepository
  ) {}

  async execute(
    recordId: string,
    dto: UpdateTrainingRecordDTO,
    context: UpdateTrainingRecordContext
  ): Promise<TrainingRecord> {
    // Find existing record
    const existingRecord = await this.trainingRecordRepository.findById(recordId);
    if (!existingRecord) {
      throw new NotFoundError('Training record');
    }

    // Track changes for audit log
    const changes: Record<string, { from: any; to: any }> = {};

    // Build update params for the entity's update() method
    const updateParams: {
      technologyId?: string;
      title?: string;
      description?: string;
      hours?: TrainingHours;
      completionDate?: string | null;
    } = {};

    if (dto.technologyId !== undefined) {
      if (dto.technologyId !== existingRecord.technologyId) {
        changes.technologyId = { from: existingRecord.technologyId, to: dto.technologyId };
      }
      updateParams.technologyId = dto.technologyId;
    }

    if (dto.title !== undefined) {
      if (dto.title.trim() !== existingRecord.title) {
        changes.title = { from: existingRecord.title, to: dto.title.trim() };
      }
      updateParams.title = dto.title;
    }

    if (dto.description !== undefined) {
      if (dto.description.trim() !== existingRecord.description) {
        changes.description = { from: existingRecord.description, to: dto.description.trim() };
      }
      updateParams.description = dto.description;
    }

    if (dto.hours !== undefined) {
      const newHours = new TrainingHours(dto.hours);
      if (dto.hours !== existingRecord.hours.getValue()) {
        changes.hours = { from: existingRecord.hours.getValue(), to: dto.hours };
      }
      updateParams.hours = newHours;
    }

    if (dto.completionDate !== undefined) {
      if (dto.completionDate !== existingRecord.completionDate) {
        changes.completionDate = { from: existingRecord.completionDate, to: dto.completionDate };
      }
      updateParams.completionDate = dto.completionDate;
    }

    // Use entity's update() method which handles updatedAt timestamp
    existingRecord.update(updateParams);

    // Persist via repository
    const updatedRecord = await this.trainingRecordRepository.update(recordId, existingRecord);

    // Create audit log entry with before/after changes
    const auditLog = AuditLog.create({
      id: uuidv4(),
      userId: context.performedByUserId,
      action: AuditAction.UPDATE,
      entityType: 'TrainingRecord',
      entityId: recordId,
      changes: Object.keys(changes).length > 0 ? changes : null,
      ipAddress: context.ipAddress ?? null,
    });

    await this.auditLogRepository.create(auditLog);

    return updatedRecord;
  }
}
