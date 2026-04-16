import { ITrainingFileRepository } from '../../../domain/repositories/ITrainingFileRepository';
import { FileStorageService } from '../../../domain/services/FileStorageService';
import { NotFoundError } from '../../../shared/errors';

export interface DeleteTrainingFileContext {
  performedByUserId: string;
}

export class DeleteTrainingFileUseCase {
  constructor(
    private trainingFileRepository: ITrainingFileRepository,
    private fileStorageService: FileStorageService
  ) {}

  async execute(fileId: string, context: DeleteTrainingFileContext): Promise<void> {
    // Find file record
    const file = await this.trainingFileRepository.findById(fileId);
    if (!file) {
      throw new NotFoundError('Training file');
    }

    // Delete file from storage
    await this.fileStorageService.deleteFile(file.storedFilename);

    // Delete file record from repository
    await this.trainingFileRepository.delete(fileId);
  }
}
