import { promises as fs } from 'fs';
import path from 'path';
import { LocalFileStorageService } from '../LocalFileStorageService';
import { ValidationError, NotFoundError } from '../../../shared/errors';
import { FILE_VALIDATION } from '../../../domain/services/FileStorageService';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
  },
}));

describe('LocalFileStorageService', () => {
  let service: LocalFileStorageService;
  const mockBaseUploadPath = './test-uploads';
  const mockSigningSecret = 'test-secret';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocalFileStorageService(mockBaseUploadPath, mockSigningSecret);
  });

  describe('uploadFile', () => {
    it('should upload a valid PDF file', async () => {
      const fileBuffer = Buffer.from('test file content');
      const originalFilename = 'test-document.pdf';
      const mimeType = 'application/pdf';

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.uploadFile(fileBuffer, originalFilename, mimeType);

      expect(result.originalFilename).toBe(originalFilename);
      expect(result.mimeType).toBe(mimeType);
      expect(result.fileSize).toBe(fileBuffer.length);
      expect(result.storedFilename).toMatch(/^[0-9a-f-]{36}\.pdf$/);
      expect(result.id).toBeDefined();
      expect(result.uploadedAt).toBeInstanceOf(Date);

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('training-files'),
        { recursive: true }
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(result.storedFilename),
        fileBuffer
      );
    });

    it('should upload a valid PNG image', async () => {
      const fileBuffer = Buffer.from('fake image data');
      const originalFilename = 'screenshot.png';
      const mimeType = 'image/png';

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.uploadFile(fileBuffer, originalFilename, mimeType);

      expect(result.mimeType).toBe(mimeType);
      expect(result.storedFilename).toMatch(/^[0-9a-f-]{36}\.png$/);
    });

    it('should upload a valid DOCX file', async () => {
      const fileBuffer = Buffer.from('fake docx data');
      const originalFilename = 'certificate.docx';
      const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.uploadFile(fileBuffer, originalFilename, mimeType);

      expect(result.mimeType).toBe(mimeType);
      expect(result.storedFilename).toMatch(/^[0-9a-f-]{36}\.docx$/);
    });

    it('should reject invalid file type', async () => {
      const fileBuffer = Buffer.from('test content');
      const originalFilename = 'test.exe';
      const mimeType = 'application/x-msdownload';

      await expect(
        service.uploadFile(fileBuffer, originalFilename, mimeType)
      ).rejects.toThrow(ValidationError);

      await expect(
        service.uploadFile(fileBuffer, originalFilename, mimeType)
      ).rejects.toThrow('File type application/x-msdownload is not allowed');
    });

    it('should reject file exceeding size limit', async () => {
      const largeBuffer = Buffer.alloc(FILE_VALIDATION.maxFileSize + 1);
      const originalFilename = 'large-file.pdf';
      const mimeType = 'application/pdf';

      await expect(
        service.uploadFile(largeBuffer, originalFilename, mimeType)
      ).rejects.toThrow(ValidationError);

      await expect(
        service.uploadFile(largeBuffer, originalFilename, mimeType)
      ).rejects.toThrow('exceeds maximum allowed size');
    });

    it('should create directory structure with year and month', async () => {
      const fileBuffer = Buffer.from('test');
      const originalFilename = 'test.pdf';
      const mimeType = 'application/pdf';

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');

      await service.uploadFile(fileBuffer, originalFilename, mimeType);

      expect(fs.mkdir).toHaveBeenCalledWith(
        path.join(mockBaseUploadPath, 'training-files', year, month),
        { recursive: true }
      );
    });

    it('should generate unique filenames for multiple uploads', async () => {
      const fileBuffer = Buffer.from('test');
      const originalFilename = 'test.pdf';
      const mimeType = 'application/pdf';

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result1 = await service.uploadFile(fileBuffer, originalFilename, mimeType);
      const result2 = await service.uploadFile(fileBuffer, originalFilename, mimeType);

      expect(result1.storedFilename).not.toBe(result2.storedFilename);
      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('downloadFile', () => {
    it('should download an existing file', async () => {
      const storedFilename = 'test-uuid.pdf';
      const fileContent = Buffer.from('file content');

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['2024'])
        .mockResolvedValueOnce(['01']);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readFile as jest.Mock).mockResolvedValue(fileContent);

      const result = await service.downloadFile(storedFilename);

      expect(result).toEqual(fileContent);
    });

    it('should throw NotFoundError for non-existent file', async () => {
      const storedFilename = 'non-existent.pdf';

      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(service.downloadFile(storedFilename)).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteFile', () => {
    it('should delete an existing file', async () => {
      const storedFilename = 'test-uuid.pdf';

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['2024'])
        .mockResolvedValueOnce(['01']);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await service.deleteFile(storedFilename);

      expect(result).toBe(true);
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should return false for non-existent file', async () => {
      const storedFilename = 'non-existent.pdf';

      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await service.deleteFile(storedFilename);

      expect(result).toBe(false);
    });
  });

  describe('generateSecureUrl', () => {
    it('should generate a secure URL with default expiration', async () => {
      const storedFilename = 'test-uuid.pdf';

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['2024'])
        .mockResolvedValueOnce(['01']);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const result = await service.generateSecureUrl(storedFilename);

      expect(result.url).toContain(`/api/files/${storedFilename}/download`);
      expect(result.url).toContain('token=');
      expect(result.url).toContain('expires=');
      expect(result.expiresAt).toBeInstanceOf(Date);

      // Check expiration is approximately 1 hour from now
      const now = new Date();
      const expectedExpiration = new Date(now.getTime() + 60 * 60 * 1000);
      const timeDiff = Math.abs(result.expiresAt.getTime() - expectedExpiration.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should generate a secure URL with custom expiration', async () => {
      const storedFilename = 'test-uuid.pdf';
      const customMinutes = 30;

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['2024'])
        .mockResolvedValueOnce(['01']);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const result = await service.generateSecureUrl(storedFilename, customMinutes);

      const now = new Date();
      const expectedExpiration = new Date(now.getTime() + customMinutes * 60 * 1000);
      const timeDiff = Math.abs(result.expiresAt.getTime() - expectedExpiration.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should throw NotFoundError for non-existent file', async () => {
      const storedFilename = 'non-existent.pdf';

      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(service.generateSecureUrl(storedFilename)).rejects.toThrow(NotFoundError);
    });

    it('should generate different tokens for different files', async () => {
      const filename1 = 'file1.pdf';
      const filename2 = 'file2.pdf';

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock)
        .mockResolvedValue(['2024'])
        .mockResolvedValue(['01']);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const result1 = await service.generateSecureUrl(filename1);
      const result2 = await service.generateSecureUrl(filename2);

      const token1 = result1.url.match(/token=([^&]+)/)?.[1];
      const token2 = result2.url.match(/token=([^&]+)/)?.[1];

      expect(token1).not.toBe(token2);
    });
  });

  describe('validateSecureUrl', () => {
    it('should validate a valid URL', async () => {
      const storedFilename = 'test-uuid.pdf';

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['2024'])
        .mockResolvedValueOnce(['01']);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const secureUrl = await service.generateSecureUrl(storedFilename);
      const urlParams = new URLSearchParams(secureUrl.url.split('?')[1]);
      const token = urlParams.get('token')!;
      const expires = parseInt(urlParams.get('expires')!);

      const isValid = service.validateSecureUrl(storedFilename, token, expires);

      expect(isValid).toBe(true);
    });

    it('should reject expired URL', () => {
      const storedFilename = 'test-uuid.pdf';
      const token = 'some-token';
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      const isValid = service.validateSecureUrl(storedFilename, token, expiredTimestamp);

      expect(isValid).toBe(false);
    });

    it('should reject tampered token', async () => {
      const storedFilename = 'test-uuid.pdf';

      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['2024'])
        .mockResolvedValueOnce(['01']);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const secureUrl = await service.generateSecureUrl(storedFilename);
      const urlParams = new URLSearchParams(secureUrl.url.split('?')[1]);
      const expires = parseInt(urlParams.get('expires')!);
      const tamperedToken = 'tampered-token-value';

      const isValid = service.validateSecureUrl(storedFilename, tamperedToken, expires);

      expect(isValid).toBe(false);
    });
  });

  describe('validateFileType', () => {
    it('should accept PDF files', () => {
      expect(service.validateFileType('application/pdf')).toBe(true);
    });

    it('should accept PNG images', () => {
      expect(service.validateFileType('image/png')).toBe(true);
    });

    it('should accept JPEG images', () => {
      expect(service.validateFileType('image/jpeg')).toBe(true);
      expect(service.validateFileType('image/jpg')).toBe(true);
    });

    it('should accept DOCX files', () => {
      expect(service.validateFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
    });

    it('should reject other file types', () => {
      expect(service.validateFileType('application/x-msdownload')).toBe(false);
      expect(service.validateFileType('text/html')).toBe(false);
      expect(service.validateFileType('application/zip')).toBe(false);
      expect(service.validateFileType('video/mp4')).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      expect(service.validateFileSize(1024)).toBe(true);
      expect(service.validateFileSize(FILE_VALIDATION.maxFileSize)).toBe(true);
      expect(service.validateFileSize(FILE_VALIDATION.maxFileSize - 1)).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      expect(service.validateFileSize(FILE_VALIDATION.maxFileSize + 1)).toBe(false);
      expect(service.validateFileSize(FILE_VALIDATION.maxFileSize * 2)).toBe(false);
    });

    it('should reject zero or negative file sizes', () => {
      expect(service.validateFileSize(0)).toBe(false);
      expect(service.validateFileSize(-1)).toBe(false);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      const storedFilename = 'test-uuid.pdf';

      (fs.access as jest.Mock)
        .mockResolvedValueOnce(undefined) // base directory
        .mockResolvedValueOnce(undefined); // file itself
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['2024'])
        .mockResolvedValueOnce(['01']);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const result = await service.fileExists(storedFilename);

      expect(result).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const storedFilename = 'non-existent.pdf';

      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await service.fileExists(storedFilename);

      expect(result).toBe(false);
    });
  });
});
