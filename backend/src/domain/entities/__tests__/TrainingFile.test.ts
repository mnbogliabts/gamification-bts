import { TrainingFile } from '../TrainingFile';

describe('TrainingFile Entity', () => {
  describe('create', () => {
    it('should create a training file with valid data', () => {
      const file = TrainingFile.create({
        id: '123',
        trainingRecordId: 'record-456',
        originalFilename: 'certificate.pdf',
        storedFilename: 'uuid-123.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      });

      expect(file.id).toBe('123');
      expect(file.trainingRecordId).toBe('record-456');
      expect(file.originalFilename).toBe('certificate.pdf');
      expect(file.storedFilename).toBe('uuid-123.pdf');
      expect(file.fileSize).toBe(1024);
      expect(file.mimeType).toBe('application/pdf');
      expect(file.uploadedAt).toBeInstanceOf(Date);
    });

    it('should accept PDF files', () => {
      const file = TrainingFile.create({
        id: '1',
        trainingRecordId: 'record-1',
        originalFilename: 'doc.pdf',
        storedFilename: 'stored.pdf',
        fileSize: 1000,
        mimeType: 'application/pdf',
      });

      expect(file.mimeType).toBe('application/pdf');
    });

    it('should accept PNG files', () => {
      const file = TrainingFile.create({
        id: '2',
        trainingRecordId: 'record-2',
        originalFilename: 'image.png',
        storedFilename: 'stored.png',
        fileSize: 1000,
        mimeType: 'image/png',
      });

      expect(file.mimeType).toBe('image/png');
    });

    it('should accept JPEG files', () => {
      const file = TrainingFile.create({
        id: '3',
        trainingRecordId: 'record-3',
        originalFilename: 'photo.jpeg',
        storedFilename: 'stored.jpeg',
        fileSize: 1000,
        mimeType: 'image/jpeg',
      });

      expect(file.mimeType).toBe('image/jpeg');
    });

    it('should accept JPG files', () => {
      const file = TrainingFile.create({
        id: '4',
        trainingRecordId: 'record-4',
        originalFilename: 'photo.jpg',
        storedFilename: 'stored.jpg',
        fileSize: 1000,
        mimeType: 'image/jpg',
      });

      expect(file.mimeType).toBe('image/jpg');
    });

    it('should accept DOCX files', () => {
      const file = TrainingFile.create({
        id: '5',
        trainingRecordId: 'record-5',
        originalFilename: 'document.docx',
        storedFilename: 'stored.docx',
        fileSize: 1000,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      expect(file.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should throw error for files exceeding 10MB', () => {
      const maxSize = 10 * 1024 * 1024;
      expect(() => {
        TrainingFile.create({
          id: '123',
          trainingRecordId: 'record-456',
          originalFilename: 'large.pdf',
          storedFilename: 'uuid-123.pdf',
          fileSize: maxSize + 1,
          mimeType: 'application/pdf',
        });
      }).toThrow('File size exceeds maximum allowed size');
    });

    it('should accept files exactly at 10MB limit', () => {
      const maxSize = 10 * 1024 * 1024;
      const file = TrainingFile.create({
        id: '123',
        trainingRecordId: 'record-456',
        originalFilename: 'large.pdf',
        storedFilename: 'uuid-123.pdf',
        fileSize: maxSize,
        mimeType: 'application/pdf',
      });

      expect(file.fileSize).toBe(maxSize);
    });

    it('should throw error for zero file size', () => {
      expect(() => {
        TrainingFile.create({
          id: '123',
          trainingRecordId: 'record-456',
          originalFilename: 'empty.pdf',
          storedFilename: 'uuid-123.pdf',
          fileSize: 0,
          mimeType: 'application/pdf',
        });
      }).toThrow('File size must be greater than 0');
    });

    it('should throw error for negative file size', () => {
      expect(() => {
        TrainingFile.create({
          id: '123',
          trainingRecordId: 'record-456',
          originalFilename: 'invalid.pdf',
          storedFilename: 'uuid-123.pdf',
          fileSize: -100,
          mimeType: 'application/pdf',
        });
      }).toThrow('File size must be greater than 0');
    });

    it('should throw error for invalid MIME type', () => {
      expect(() => {
        TrainingFile.create({
          id: '123',
          trainingRecordId: 'record-456',
          originalFilename: 'script.js',
          storedFilename: 'uuid-123.js',
          fileSize: 1024,
          mimeType: 'application/javascript',
        });
      }).toThrow('File type application/javascript is not allowed');
    });

    it('should throw error for empty original filename', () => {
      expect(() => {
        TrainingFile.create({
          id: '123',
          trainingRecordId: 'record-456',
          originalFilename: '',
          storedFilename: 'uuid-123.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        });
      }).toThrow('Original filename is required');
    });

    it('should throw error for empty stored filename', () => {
      expect(() => {
        TrainingFile.create({
          id: '123',
          trainingRecordId: 'record-456',
          originalFilename: 'file.pdf',
          storedFilename: '',
          fileSize: 1024,
          mimeType: 'application/pdf',
        });
      }).toThrow('Stored filename is required');
    });

    it('should throw error for empty training record ID', () => {
      expect(() => {
        TrainingFile.create({
          id: '123',
          trainingRecordId: '',
          originalFilename: 'file.pdf',
          storedFilename: 'uuid-123.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        });
      }).toThrow('Training record ID is required');
    });
  });

  describe('toJSON', () => {
    it('should serialize training file to JSON', () => {
      const file = TrainingFile.create({
        id: '123',
        trainingRecordId: 'record-456',
        originalFilename: 'certificate.pdf',
        storedFilename: 'uuid-123.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      });

      const json = file.toJSON();

      expect(json).toEqual({
        id: '123',
        trainingRecordId: 'record-456',
        originalFilename: 'certificate.pdf',
        storedFilename: 'uuid-123.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        uploadedAt: expect.any(String),
      });
    });
  });
});
