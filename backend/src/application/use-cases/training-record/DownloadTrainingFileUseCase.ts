import { UserRole } from '../../../domain/entities/User';
import { ITrainingFileRepository } from '../../../domain/repositories/ITrainingFileRepository';
import { ITrainingRecordRepository } from '../../../domain/repositories/ITrainingRecordRepository';
import { FileStorageService, SecureDownloadUrl } from '../../../domain/services/FileStorageService';
import { NotFoundError, AuthorizationError } from '../../../shared/errors';

export interface DownloadTrainingFileContext {
  requestingUserId: string;
  requestingUserRole: UserRole;
}

export interface DownloadTrainingFileResult {
  fileBuffer: Buffer;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  secureUrl: SecureDownloadUrl;
}

export class DownloadTrainingFileUseCase {
  constructor(
    private trainingFileRepository: ITrainingFileRepository,
    private trainingRecordRepository: ITrainingRecordRepository,
    private fileStorageService: FileStorageService
  ) {}

  async execute(fileId: string, context: DownloadTrainingFileContext): Promise<DownloadTrainingFileResult> {
    // Find file record
    const file = await this.trainingFileRepository.findById(fileId);
    if (!file) {
      throw new NotFoundError('Training file');
    }

    // Find associated training record for authorization check
    const record = await this.trainingRecordRepository.findById(file.trainingRecordId);
    if (!record) {
      throw new NotFoundError('Training record');
    }

    // Authorization: admins can download any file, employees only their own records' files
    if (context.requestingUserRole !== UserRole.ADMIN && record.userId !== context.requestingUserId) {
      throw new AuthorizationError('You do not have permission to download this file');
    }

    // Generate secure time-limited download URL
    const secureUrl = await this.fileStorageService.generateSecureUrl(file.storedFilename);

    // Download the file data
    const fileBuffer = await this.fileStorageService.downloadFile(file.storedFilename);

    return {
      fileBuffer,
      originalFilename: file.originalFilename,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      secureUrl,
    };
  }
}
