/**
 * FileStorageService Interface
 * 
 * This is a domain service interface that defines the contract for file storage operations.
 * The actual implementation will be in the infrastructure layer.
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 12.1, 12.2, 12.4
 */

export interface FileMetadata {
  id: string;
  originalFilename: string;
  storedFilename: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface SecureDownloadUrl {
  url: string;
  expiresAt: Date;
}

export interface FileStorageService {
  /**
   * Upload a file to storage
   * Validates: Requirements 5.1, 5.2, 5.4
   * 
   * @param file - File buffer or stream
   * @param originalFilename - Original filename from user
   * @param mimeType - MIME type of the file
   * @returns File metadata including generated unique identifier
   * @throws Error if file type is invalid or file size exceeds limit
   */
  uploadFile(
    file: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<FileMetadata>;

  /**
   * Download a file from storage
   * Validates: Requirements 12.2
   * 
   * @param storedFilename - Unique stored filename
   * @returns File buffer
   * @throws Error if file not found
   */
  downloadFile(storedFilename: string): Promise<Buffer>;

  /**
   * Delete a file from storage
   * Validates: Requirements 5.5
   * 
   * @param storedFilename - Unique stored filename
   * @returns True if deleted successfully
   */
  deleteFile(storedFilename: string): Promise<boolean>;

  /**
   * Generate a secure, time-limited download URL
   * Validates: Requirements 12.4
   * 
   * @param storedFilename - Unique stored filename
   * @param expirationMinutes - Minutes until URL expires (default: 60)
   * @returns Secure download URL with expiration
   */
  generateSecureUrl(
    storedFilename: string,
    expirationMinutes?: number
  ): Promise<SecureDownloadUrl>;

  /**
   * Validate file type against allowed MIME types
   * Validates: Requirements 5.1
   * 
   * @param mimeType - MIME type to validate
   * @returns True if file type is allowed
   */
  validateFileType(mimeType: string): boolean;

  /**
   * Validate file size against maximum limit
   * Validates: Requirements 5.2
   * 
   * @param fileSize - File size in bytes
   * @returns True if file size is within limit
   */
  validateFileSize(fileSize: number): boolean;

  /**
   * Check if a file exists in storage
   * 
   * @param storedFilename - Unique stored filename
   * @returns True if file exists
   */
  fileExists(storedFilename: string): Promise<boolean>;
}

/**
 * File validation constants
 */
export const FILE_VALIDATION = {
  allowedMimeTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB in bytes
  maxFilesPerRecord: 10,
  defaultExpirationMinutes: 60,
} as const;
