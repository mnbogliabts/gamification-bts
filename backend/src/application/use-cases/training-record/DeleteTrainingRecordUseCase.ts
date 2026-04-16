import { v4 as uuidv4 } from 'uuid';
import { AuditLog, AuditAction } from '../../../domain/entities/AuditLog';
import { ITrainingRecordRepository } from '../../../domain/repositories/ITrainingRecordRepository';
import { ITrainingFileRepository } from '../../../domain/repositories/ITrainingFileRepository';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { FileStorageService } from '../../../domain/services/FileStorageService';
import { NotFoundError } from '../../../shared/errors';

export interface DeleteTrainingRecordContext {
  performedByUserId: string;
  ipAddress?: string;
}

export class DeleteTrainingRecordUseCase {
  constructor(
    private trainingRecordRepository: ITrainingRecordRepository,
    private trainingFileRepository: ITrainingFileRepository,
    private auditLogRepository: IAuditLogRepository,
    private fileStorageService: FileStorageService
  ) {}

  async execute(recordId: string, context: DeleteTrainingRecordContext): Promise<void> {
    // Find existing record
    const existingRecord = await this.trainingRecordRepository.findById(recordId);
    if (!existingRecord) {
      throw new NotFoundError('Training record');
    }

    // Delete all associated files from storage (cascade)
    const files = await this.trainingFileRepository.findByTrainingRecordId(recordId);
    for (const file of files) {
      await this.fileStorageService.deleteFile(file.storedFilename);
      await this.trainingFileRepository.delete(file.id);
    }

    // Delete the training record
    await this.trainingRecordRepository.delete(recordId);

    // Create audit log entry
    const auditLog = AuditLog.create({
      id: uuidv4(),
      userId: context.performedByUserId,
      action: AuditAction.DELETE,
      entityType: 'TrainingRecord',
      entityId: recordId,
      changes: {
        deletedRecord: {
          userId: existingRecord.userId,
          technologyId: existingRecord.technologyId,
          title: existingRecord.title,
          hours: existingRecord.hours.getValue(),
          filesDeleted: files.length,
        },
      },
      ipAddress: context.ipAddress ?? null,
    });

    await this.auditLogRepository.create(auditLog);
  }
}
