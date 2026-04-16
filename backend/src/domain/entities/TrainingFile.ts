export interface TrainingFileProps {
  id: string;
  trainingRecordId: string;
  originalFilename: string;
  storedFilename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export class TrainingFile {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  private static readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  private constructor(private props: TrainingFileProps) {}

  static create(params: {
    id: string;
    trainingRecordId: string;
    originalFilename: string;
    storedFilename: string;
    fileSize: number;
    mimeType: string;
    uploadedAt?: Date;
  }): TrainingFile {
    // Validate file size
    if (params.fileSize > TrainingFile.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${TrainingFile.MAX_FILE_SIZE} bytes`);
    }

    if (params.fileSize <= 0) {
      throw new Error('File size must be greater than 0');
    }

    // Validate MIME type
    if (!TrainingFile.ALLOWED_MIME_TYPES.includes(params.mimeType)) {
      throw new Error(`File type ${params.mimeType} is not allowed. Allowed types: ${TrainingFile.ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Validate required fields
    if (!params.originalFilename || params.originalFilename.trim().length === 0) {
      throw new Error('Original filename is required');
    }

    if (!params.storedFilename || params.storedFilename.trim().length === 0) {
      throw new Error('Stored filename is required');
    }

    if (!params.trainingRecordId || params.trainingRecordId.trim().length === 0) {
      throw new Error('Training record ID is required');
    }

    return new TrainingFile({
      id: params.id,
      trainingRecordId: params.trainingRecordId,
      originalFilename: params.originalFilename,
      storedFilename: params.storedFilename,
      fileSize: params.fileSize,
      mimeType: params.mimeType,
      uploadedAt: params.uploadedAt ?? new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get trainingRecordId(): string {
    return this.props.trainingRecordId;
  }

  get originalFilename(): string {
    return this.props.originalFilename;
  }

  get storedFilename(): string {
    return this.props.storedFilename;
  }

  get fileSize(): number {
    return this.props.fileSize;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get uploadedAt(): Date {
    return this.props.uploadedAt;
  }

  toJSON() {
    return {
      id: this.props.id,
      trainingRecordId: this.props.trainingRecordId,
      originalFilename: this.props.originalFilename,
      storedFilename: this.props.storedFilename,
      fileSize: this.props.fileSize,
      mimeType: this.props.mimeType,
      uploadedAt: this.props.uploadedAt.toISOString(),
    };
  }
}
