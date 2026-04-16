import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  FileStorageService,
  FileMetadata,
  SecureDownloadUrl,
  FILE_VALIDATION,
} from '../../domain/services/FileStorageService';
import { ValidationError, NotFoundError } from '../../shared/errors';

/**
 * Local filesystem implementation of FileStorageService
 * 
 * Stores files in: /uploads/training-files/{year}/{month}/{uuid}.{extension}
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 12.2, 12.4, 20.4
 */
export class LocalFileStorageService implements FileStorageService {
  private readonly baseUploadPath: string;
  private readonly urlSigningSecret: string;

  constructor(baseUploadPath: string = './uploads', urlSigningSecret?: string) {
    this.baseUploadPath = baseUploadPath;
    this.urlSigningSecret = urlSigningSecret || process.env.URL_SIGNING_SECRET || 'default-secret-change-in-production';
  }

  /**
   * Upload a file to storage
   * Validates: Requirements 5.1, 5.2, 5.4, 20.4
   */
  async uploadFile(
    file: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<FileMetadata> {
    // Validate file type
    if (!this.validateFileType(mimeType)) {
      throw new ValidationError(
        `File type ${mimeType} is not allowed. Allowed types: ${FILE_VALIDATION.allowedMimeTypes.join(', ')}`
      );
    }

    // Validate file size
    if (!this.validateFileSize(file.length)) {
      throw new ValidationError(
        `File size ${file.length} bytes exceeds maximum allowed size of ${FILE_VALIDATION.maxFileSize} bytes (10MB)`
      );
    }

    // Generate unique filename using UUID (non-guessable)
    const fileExtension = this.extractFileExtension(originalFilename);
    const uniqueId = uuidv4();
    const storedFilename = `${uniqueId}${fileExtension}`;

    // Create directory structure: /uploads/training-files/{year}/{month}/
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const directoryPath = path.join(
      this.baseUploadPath,
      'training-files',
      year,
      month
    );

    // Ensure directory exists
    await fs.mkdir(directoryPath, { recursive: true });

    // Write file to disk
    const filePath = path.join(directoryPath, storedFilename);
    await fs.writeFile(filePath, file);

    return {
      id: uniqueId,
      originalFilename,
      storedFilename,
      fileSize: file.length,
      mimeType,
      uploadedAt: now,
    };
  }

  /**
   * Download a file from storage
   * Validates: Requirements 12.2
   */
  async downloadFile(storedFilename: string): Promise<Buffer> {
    const filePath = await this.findFilePath(storedFilename);
    
    if (!filePath) {
      throw new NotFoundError('File');
    }

    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new NotFoundError('File');
    }
  }

  /**
   * Delete a file from storage
   * Validates: Requirements 5.5
   */
  async deleteFile(storedFilename: string): Promise<boolean> {
    const filePath = await this.findFilePath(storedFilename);
    
    if (!filePath) {
      return false;
    }

    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a secure, time-limited download URL
   * Validates: Requirements 12.4
   * 
   * URL format: /api/files/{storedFilename}/download?token={signedToken}&expires={timestamp}
   */
  async generateSecureUrl(
    storedFilename: string,
    expirationMinutes: number = FILE_VALIDATION.defaultExpirationMinutes
  ): Promise<SecureDownloadUrl> {
    // Check if file exists
    const exists = await this.fileExists(storedFilename);
    if (!exists) {
      throw new NotFoundError('File');
    }

    // Calculate expiration timestamp (1 hour from now by default)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);
    const expiresTimestamp = Math.floor(expiresAt.getTime() / 1000);

    // Create signature using HMAC-SHA256
    const dataToSign = `${storedFilename}:${expiresTimestamp}`;
    const signature = crypto
      .createHmac('sha256', this.urlSigningSecret)
      .update(dataToSign)
      .digest('hex');

    // Generate URL with token and expiration
    const url = `/api/files/${storedFilename}/download?token=${signature}&expires=${expiresTimestamp}`;

    return {
      url,
      expiresAt,
    };
  }

  /**
   * Validate a secure download URL
   * Used by the download endpoint to verify the URL hasn't been tampered with
   */
  validateSecureUrl(storedFilename: string, token: string, expiresTimestamp: number): boolean {
    // Check if URL has expired
    const now = Math.floor(Date.now() / 1000);
    if (now > expiresTimestamp) {
      return false;
    }

    // Recreate signature and compare
    const dataToSign = `${storedFilename}:${expiresTimestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.urlSigningSecret)
      .update(dataToSign)
      .digest('hex');

    return token === expectedSignature;
  }

  /**
   * Validate file type against allowed MIME types
   * Validates: Requirements 5.1
   */
  validateFileType(mimeType: string): boolean {
    return (FILE_VALIDATION.allowedMimeTypes as readonly string[]).includes(mimeType);
  }

  /**
   * Validate file size against maximum limit
   * Validates: Requirements 5.2
   */
  validateFileSize(fileSize: number): boolean {
    return fileSize > 0 && fileSize <= FILE_VALIDATION.maxFileSize;
  }

  /**
   * Check if a file exists in storage
   */
  async fileExists(storedFilename: string): Promise<boolean> {
    const filePath = await this.findFilePath(storedFilename);
    
    if (!filePath) {
      return false;
    }

    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find the full path to a stored file by searching the directory structure
   * Files are stored in /uploads/training-files/{year}/{month}/{filename}
   */
  private async findFilePath(storedFilename: string): Promise<string | null> {
    const trainingFilesPath = path.join(this.baseUploadPath, 'training-files');

    try {
      // Check if base directory exists
      await fs.access(trainingFilesPath);
    } catch {
      return null;
    }

    // Search through year directories
    const years = await fs.readdir(trainingFilesPath);
    
    for (const year of years) {
      const yearPath = path.join(trainingFilesPath, year);
      const yearStat = await fs.stat(yearPath);
      
      if (!yearStat.isDirectory()) continue;

      // Search through month directories
      const months = await fs.readdir(yearPath);
      
      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        const monthStat = await fs.stat(monthPath);
        
        if (!monthStat.isDirectory()) continue;

        // Check if file exists in this month directory
        const filePath = path.join(monthPath, storedFilename);
        
        try {
          await fs.access(filePath);
          return filePath;
        } catch {
          // File not in this directory, continue searching
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Extract file extension from filename
   */
  private extractFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return '';
    }
    return filename.substring(lastDotIndex);
  }
}
