import * as fc from 'fast-check';
import { LocalFileStorageService } from '../LocalFileStorageService';
import { FILE_VALIDATION } from '../../../domain/services/FileStorageService';
import { ValidationError } from '../../../shared/errors';
import { promises as fs } from 'fs';

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

describe('File Storage - Property-Based Tests', () => {
  let service: LocalFileStorageService;
  const mockBaseUploadPath = './test-uploads';
  const mockSigningSecret = 'test-secret-for-property-tests';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocalFileStorageService(mockBaseUploadPath, mockSigningSecret);
  });

  describe('Property 22: File Type Validation', () => {
    /**
     * **Validates: Requirements 5.1**
     * 
     * For any file upload attempt, the system must accept only files with MIME types
     * matching PDF, PNG, JPG, JPEG, or DOCX, and reject all other file types.
     */
    it('should accept all allowed MIME types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...FILE_VALIDATION.allowedMimeTypes),
          (mimeType) => {
            const isValid = service.validateFileType(mimeType);
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject any MIME type not in the allowed list', () => {
      fc.assert(
        fc.property(
          fc.string().filter(mimeType => {
            const allowed = FILE_VALIDATION.allowedMimeTypes as readonly string[];
            return !allowed.includes(mimeType) && mimeType.length > 0;
          }),
          (mimeType) => {
            const isValid = service.validateFileType(mimeType);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject file uploads with invalid MIME types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fileContent: fc.uint8Array({ minLength: 1, maxLength: 1000 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }),
            invalidMimeType: fc.oneof(
              fc.constant('application/x-msdownload'),
              fc.constant('text/html'),
              fc.constant('application/zip'),
              fc.constant('video/mp4'),
              fc.constant('audio/mpeg'),
              fc.constant('application/javascript')
            ),
          }),
          async (props) => {
            const fileBuffer = Buffer.from(props.fileContent);
            
            await expect(
              service.uploadFile(fileBuffer, props.filename, props.invalidMimeType)
            ).rejects.toThrow(ValidationError);
            
            await expect(
              service.uploadFile(fileBuffer, props.filename, props.invalidMimeType)
            ).rejects.toThrow(`File type ${props.invalidMimeType} is not allowed`);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should accept file uploads with valid MIME types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fileContent: fc.uint8Array({ minLength: 1, maxLength: 1000 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }),
            validMimeType: fc.constantFrom(...FILE_VALIDATION.allowedMimeTypes),
          }),
          async (props) => {
            const fileBuffer = Buffer.from(props.fileContent);
            
            (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            const result = await service.uploadFile(
              fileBuffer,
              props.filename,
              props.validMimeType
            );
            
            expect(result.mimeType).toBe(props.validMimeType);
            expect(result.originalFilename).toBe(props.filename);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 23: File Size Validation', () => {
    /**
     * **Validates: Requirements 5.2**
     * 
     * For any file upload attempt, the system must reject files larger than 10 MB
     * (10,485,760 bytes) and return an error message.
     */
    it('should accept files at or below the size limit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: FILE_VALIDATION.maxFileSize }),
          (fileSize) => {
            const isValid = service.validateFileSize(fileSize);
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject files exceeding the size limit', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: FILE_VALIDATION.maxFileSize + 1, max: FILE_VALIDATION.maxFileSize * 2 }),
          (fileSize) => {
            const isValid = service.validateFileSize(fileSize);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject file uploads exceeding 10MB', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            oversizeAmount: fc.integer({ min: 1, max: 1000000 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }),
            mimeType: fc.constantFrom(...FILE_VALIDATION.allowedMimeTypes),
          }),
          async (props) => {
            const fileSize = FILE_VALIDATION.maxFileSize + props.oversizeAmount;
            const fileBuffer = Buffer.alloc(fileSize);
            
            await expect(
              service.uploadFile(fileBuffer, props.filename, props.mimeType)
            ).rejects.toThrow(ValidationError);
            
            await expect(
              service.uploadFile(fileBuffer, props.filename, props.mimeType)
            ).rejects.toThrow('exceeds maximum allowed size');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should accept file uploads at exactly 10MB', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            filename: fc.string({ minLength: 1, maxLength: 100 }),
            mimeType: fc.constantFrom(...FILE_VALIDATION.allowedMimeTypes),
          }),
          async (props) => {
            const fileBuffer = Buffer.alloc(FILE_VALIDATION.maxFileSize);
            
            (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            const result = await service.uploadFile(
              fileBuffer,
              props.filename,
              props.mimeType
            );
            
            expect(result.fileSize).toBe(FILE_VALIDATION.maxFileSize);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should reject zero or negative file sizes', () => {
      fc.assert(
        fc.property(
          fc.integer({ max: 0 }),
          (fileSize) => {
            const isValid = service.validateFileSize(fileSize);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 24: File Count Limit', () => {
    /**
     * **Validates: Requirements 5.3**
     * 
     * For any training record in the system, it must have at most 10 associated files,
     * and attempts to upload additional files must be rejected.
     * 
     * Note: This property is enforced at the application/repository layer, not in the
     * storage service itself. The storage service can store unlimited files; the count
     * limit is enforced when associating files with training records.
     */
    it('should verify the file count limit constant is set to 10', () => {
      expect(FILE_VALIDATION.maxFilesPerRecord).toBe(10);
    });

    it('should allow uploading any number of files to storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          fc.record({
            filename: fc.string({ minLength: 1, maxLength: 100 }),
            mimeType: fc.constantFrom(...FILE_VALIDATION.allowedMimeTypes),
          }),
          async (fileCount, props) => {
            (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            const uploadedFiles = [];
            
            for (let i = 0; i < fileCount; i++) {
              const fileBuffer = Buffer.from(`file content ${i}`);
              const result = await service.uploadFile(
                fileBuffer,
                `${props.filename}-${i}`,
                props.mimeType
              );
              uploadedFiles.push(result);
            }
            
            // Storage service should accept all uploads
            expect(uploadedFiles.length).toBe(fileCount);
            
            // Each file should have a unique ID
            const uniqueIds = new Set(uploadedFiles.map(f => f.id));
            expect(uniqueIds.size).toBe(fileCount);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 25: Unique File Identifier Generation', () => {
    /**
     * **Validates: Requirements 5.4**
     * 
     * For any file uploaded to the system, a unique identifier (UUID) must be generated
     * as the stored filename, ensuring no two files have the same stored filename.
     */
    it('should generate unique identifiers for all uploaded files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              fileContent: fc.uint8Array({ minLength: 1, maxLength: 1000 }),
              filename: fc.string({ minLength: 1, maxLength: 100 }),
              mimeType: fc.constantFrom(...FILE_VALIDATION.allowedMimeTypes),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (fileSpecs) => {
            (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            const uploadedFiles = [];
            
            for (const spec of fileSpecs) {
              const fileBuffer = Buffer.from(spec.fileContent);
              const result = await service.uploadFile(
                fileBuffer,
                spec.filename,
                spec.mimeType
              );
              uploadedFiles.push(result);
            }
            
            // All IDs must be unique
            const ids = uploadedFiles.map(f => f.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
            
            // All stored filenames must be unique
            const storedFilenames = uploadedFiles.map(f => f.storedFilename);
            const uniqueFilenames = new Set(storedFilenames);
            expect(uniqueFilenames.size).toBe(storedFilenames.length);
            
            // Each stored filename should contain a UUID pattern
            for (const file of uploadedFiles) {
              expect(file.storedFilename).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate UUIDs that are non-guessable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fileContent: fc.uint8Array({ minLength: 1, maxLength: 1000 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }),
            mimeType: fc.constantFrom(...FILE_VALIDATION.allowedMimeTypes),
          }),
          async (props) => {
            (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            const fileBuffer = Buffer.from(props.fileContent);
            const result = await service.uploadFile(
              fileBuffer,
              props.filename,
              props.mimeType
            );
            
            // ID should be a valid UUID v4 format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(result.id).toMatch(uuidRegex);
            
            // Stored filename should not contain the original filename (except extension)
            const originalNameWithoutExt = props.filename.replace(/\.[^.]+$/, '');
            // Only check if the original name is meaningful (more than 2 chars and not just special chars)
            if (originalNameWithoutExt.length > 2 && /[a-zA-Z0-9]{2,}/.test(originalNameWithoutExt)) {
              expect(result.storedFilename.toLowerCase()).not.toContain(
                originalNameWithoutExt.toLowerCase()
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate different IDs even for identical file content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fileContent: fc.uint8Array({ minLength: 1, maxLength: 1000 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }),
            mimeType: fc.constantFrom(...FILE_VALIDATION.allowedMimeTypes),
            uploadCount: fc.integer({ min: 2, max: 5 }),
          }),
          async (props) => {
            (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            const fileBuffer = Buffer.from(props.fileContent);
            const uploadedFiles = [];
            
            // Upload the same file multiple times
            for (let i = 0; i < props.uploadCount; i++) {
              const result = await service.uploadFile(
                fileBuffer,
                props.filename,
                props.mimeType
              );
              uploadedFiles.push(result);
            }
            
            // All IDs must be unique despite identical content
            const ids = uploadedFiles.map(f => f.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(props.uploadCount);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 26: Cascade File Deletion', () => {
    /**
     * **Validates: Requirements 5.5**
     * 
     * For any training record that is deleted, all associated files must also be
     * deleted from the file storage system within 24 hours.
     * 
     * Note: This property tests the file deletion capability. The cascade behavior
     * is enforced at the application/repository layer when a training record is deleted.
     */
    it('should successfully delete any existing file', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid().map(uuid => `${uuid}.pdf`),
          async (storedFilename) => {
            // Mock file exists
            (fs.access as jest.Mock).mockResolvedValue(undefined);
            (fs.readdir as jest.Mock)
              .mockResolvedValueOnce(['2024'])
              .mockResolvedValueOnce(['01']);
            (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
            (fs.unlink as jest.Mock).mockResolvedValue(undefined);
            
            const result = await service.deleteFile(storedFilename);
            
            expect(result).toBe(true);
            expect(fs.unlink).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false when attempting to delete non-existent files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid().map(uuid => `${uuid}.pdf`),
          async (storedFilename) => {
            // Mock file does not exist
            (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
            
            const result = await service.deleteFile(storedFilename);
            
            expect(result).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be able to delete multiple files independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.uuid().map(uuid => `${uuid}.pdf`),
            { minLength: 2, maxLength: 10 }
          ).filter(arr => {
            // Ensure all filenames are unique
            const uniqueSet = new Set(arr);
            return uniqueSet.size === arr.length;
          }),
          async (storedFilenames) => {
            // Clear mocks before each iteration
            jest.clearAllMocks();
            
            // Mock all files exist
            (fs.access as jest.Mock).mockResolvedValue(undefined);
            (fs.readdir as jest.Mock)
              .mockResolvedValue(['2024'])
              .mockResolvedValue(['01']);
            (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
            (fs.unlink as jest.Mock).mockResolvedValue(undefined);
            
            const deleteResults = [];
            
            for (const filename of storedFilenames) {
              const result = await service.deleteFile(filename);
              deleteResults.push(result);
            }
            
            // All deletions should succeed
            expect(deleteResults.every(r => r === true)).toBe(true);
            expect(fs.unlink).toHaveBeenCalledTimes(storedFilenames.length);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 73: Non-Guessable Filenames', () => {
    /**
     * **Validates: Requirements 20.4**
     * 
     * For any file uploaded to the system, the stored filename must be a UUID or
     * similarly random identifier that cannot be guessed or enumerated by unauthorized users.
     */
    it('should generate non-guessable filenames using UUIDs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            fileContent: fc.uint8Array({ minLength: 1, maxLength: 1000 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }),
            mimeType: fc.constantFrom(...FILE_VALIDATION.allowedMimeTypes),
          }),
          async (props) => {
            (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            const fileBuffer = Buffer.from(props.fileContent);
            const result = await service.uploadFile(
              fileBuffer,
              props.filename,
              props.mimeType
            );
            
            // Stored filename should be a UUID with extension (or just UUID if no extension)
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
            expect(result.storedFilename).toMatch(uuidPattern);
            
            // Should not contain any part of the original filename (except extension)
            const originalNameWithoutExt = props.filename.replace(/\.[^.]+$/, '');
            // Only check if the original name is meaningful (more than 2 chars and not just special chars)
            if (originalNameWithoutExt.length > 2 && /[a-zA-Z0-9]{2,}/.test(originalNameWithoutExt)) {
              expect(result.storedFilename.toLowerCase()).not.toContain(
                originalNameWithoutExt.toLowerCase()
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not allow filename enumeration through sequential patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              fileContent: fc.uint8Array({ minLength: 1, maxLength: 100 }),
              filename: fc.string({ minLength: 1, maxLength: 50 }),
              mimeType: fc.constantFrom(...FILE_VALIDATION.allowedMimeTypes),
            }),
            { minLength: 5, maxLength: 10 }
          ),
          async (fileSpecs) => {
            (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            const uploadedFiles = [];
            
            for (const spec of fileSpecs) {
              const fileBuffer = Buffer.from(spec.fileContent);
              const result = await service.uploadFile(
                fileBuffer,
                spec.filename,
                spec.mimeType
              );
              uploadedFiles.push(result);
            }
            
            // Extract UUIDs from stored filenames
            const uuids = uploadedFiles.map(f => f.id);
            
            // Check that UUIDs are not sequential
            for (let i = 1; i < uuids.length; i++) {
              const prev = uuids[i - 1];
              const curr = uuids[i];
              
              // UUIDs should not be sequential (differ by 1)
              expect(curr).not.toBe(prev);
              
              // Should not have predictable patterns
              const prevNum = parseInt(prev.replace(/-/g, '').substring(0, 8), 16);
              const currNum = parseInt(curr.replace(/-/g, '').substring(0, 8), 16);
              expect(Math.abs(currNum - prevNum)).not.toBe(1);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should generate secure download URLs with non-guessable tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid().map(uuid => `${uuid}.pdf`),
          async (storedFilename) => {
            // Mock file exists
            (fs.access as jest.Mock).mockResolvedValue(undefined);
            (fs.readdir as jest.Mock)
              .mockResolvedValueOnce(['2024'])
              .mockResolvedValueOnce(['01']);
            (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
            
            const result = await service.generateSecureUrl(storedFilename);
            
            // URL should contain a token
            expect(result.url).toContain('token=');
            
            // Extract token
            const tokenMatch = result.url.match(/token=([^&]+)/);
            expect(tokenMatch).not.toBeNull();
            
            const token = tokenMatch![1];
            
            // Token should be a hex string (HMAC-SHA256 output)
            expect(token).toMatch(/^[0-9a-f]{64}$/i);
            
            // Token should not be predictable from filename alone
            expect(token).not.toContain(storedFilename);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate different tokens for the same file at different times', async () => {
      const storedFilename = `${fc.sample(fc.uuid(), 1)[0]}.pdf`;
      
      // Mock file exists
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.readdir as jest.Mock)
        .mockResolvedValue(['2024'])
        .mockResolvedValue(['01']);
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      
      // Generate URL at time T
      const result1 = await service.generateSecureUrl(storedFilename);
      const token1 = result1.url.match(/token=([^&]+)/)?.[1];
      
      // Wait a moment to ensure different expiration timestamp (at least 1 second)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Generate URL at time T+1
      const result2 = await service.generateSecureUrl(storedFilename);
      const token2 = result2.url.match(/token=([^&]+)/)?.[1];
      
      // Tokens should be different due to different expiration times
      expect(token1).not.toBe(token2);
    });
  });
});
