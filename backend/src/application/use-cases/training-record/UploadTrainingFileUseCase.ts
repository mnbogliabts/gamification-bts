import { v4 as uuidv4 } from 'uuid';
import { TrainingFile } from '../../../domain/entities/TrainingFile';
import { ITrainingRecordRepository } from '../../../domain/repositories/ITrainingRecordRepository';
import { ITrainingFileRepository } from '../../../domain/repositories/ITrainingFileRepository';
import { FileStorageService } from '../../../domain/services/FileStorageService';
import { NotFoundError, ValidationError } from '../../../shared/errors';

export interface UploadTrainingFileDTO {
  trainingRecordId: string;
  file: Buffer;
  originalFilename: string;
  mimeType: string;
}

export interface UploadTrainingFileContext {
  performedByUserId: string;
}

export class UploadTrainingFileUseCase {
  constructor(
    private trainingRecordRepository: ITrainingRecordRepository,
    private trainingFileRepository: ITrainingFileRepository,
    private fileStorageService: FileStorageService
  ) {}

  async execute(dto: UploadTrainingFileDTO, context: UploadTrainingFileContext): Promise<TrainingFile> {
    // Find the training record
    const record = await this.trainingRecordRepository.findById(dto.trainingRecordId);
    if (!record) {
      throw new NotFoundError('Training record');
    }

    // Check file count limit (max 10 per record)
    const existingFiles = await this.trainingFileRepository.findByTrainingRecordId(dto.trainingRecordId);
    if (existingFiles.length >= 10) {
      throw new ValidationError('Maximum of 10 files per training record exceeded');
    }

    // Validate file type
    if (!this.fileStorageService.validateFileType(dto.mimeType)) {
      throw new ValidationError(`File type ${dto.mimeType} is not allowed. Allowed types: PDF, PNG, JPG, JPEG, DOCX`);
    }

    // Validate file size
    if (!this.fileStorageService.validateFileSize(dto.file.length)) {
      throw new ValidationError('File size exceeds the maximum allowed size of 10MB');
    }

    // Upload file to storage
    const fileMetadata = await this.fileStorageService.uploadFile(
      dto.file,
      dto.originalFilename,
      dto.mimeType
    );

    try {
      // Create TrainingFile entity
      const trainingFile = TrainingFile.create({
        id: fileMetadata.id || uuidv4(),
        trainingRecordId: dto.trainingRecordId,
        originalFilename: dto.originalFilename,
        storedFilename: fileMetadata.storedFilename,
        fileSize: fileMetadata.fileSize,
        mimeType: dto.mimeType,
        uploadedAt: fileMetadata.uploadedAt,
      });

      // Persist file record via repository
      const createdFile = await this.trainingFileRepository.create(trainingFile);

      // Add file to training record entity
      record.addFile(createdFile);

      return createdFile;
    } catch (error) {
      // Rollback: delete the uploaded file from storage if DB persistence fails
      await this.fileStorageService.deleteFile(fileMetadata.storedFilename);
      throw error;
    }
  }
}
