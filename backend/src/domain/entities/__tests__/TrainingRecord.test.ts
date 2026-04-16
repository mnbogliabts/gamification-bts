import { TrainingRecord } from '../TrainingRecord';
import { TrainingFile } from '../TrainingFile';
import { TrainingHours } from '../../value-objects/TrainingHours';
import { ValidationError } from '../../../shared/errors';

describe('TrainingRecord Entity', () => {
  describe('create', () => {
    it('should create a training record with all required fields', () => {
      const hours = new TrainingHours(5.5);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'React Training',
        description: 'Advanced React patterns and hooks',
        hours,
      });

      expect(record.id).toBe('123');
      expect(record.userId).toBe('user-456');
      expect(record.technologyId).toBe('tech-789');
      expect(record.title).toBe('React Training');
      expect(record.description).toBe('Advanced React patterns and hooks');
      expect(record.hours).toBe(hours);
      expect(record.completionDate).toBeNull();
      expect(record.createdAt).toBeInstanceOf(Date);
      expect(record.updatedAt).toBeInstanceOf(Date);
      expect(record.files).toEqual([]);
    });

    it('should trim whitespace from title and description', () => {
      const hours = new TrainingHours(3.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: '  JavaScript Basics  ',
        description: '  Learning fundamentals  ',
        hours,
      });

      expect(record.title).toBe('JavaScript Basics');
      expect(record.description).toBe('Learning fundamentals');
    });

    it('should create a training record with files', () => {
      const hours = new TrainingHours(8.0);
      const file = TrainingFile.create({
        id: 'file-1',
        trainingRecordId: '123',
        originalFilename: 'cert.pdf',
        storedFilename: 'uuid-1.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      });

      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
        files: [file],
      });

      expect(record.files).toHaveLength(1);
      expect(record.files[0]).toBe(file);
    });

    it('should throw error when userId is empty', () => {
      const hours = new TrainingHours(5.0);
      expect(() => {
        TrainingRecord.create({
          id: '123',
          userId: '',
          technologyId: 'tech-789',
          title: 'Training',
          description: 'Description',
          hours,
        });
      }).toThrow('User ID is required');
    });

    it('should throw error when technologyId is empty', () => {
      const hours = new TrainingHours(5.0);
      expect(() => {
        TrainingRecord.create({
          id: '123',
          userId: 'user-456',
          technologyId: '',
          title: 'Training',
          description: 'Description',
          hours,
        });
      }).toThrow('Technology ID is required');
    });

    it('should throw error when title is empty', () => {
      const hours = new TrainingHours(5.0);
      expect(() => {
        TrainingRecord.create({
          id: '123',
          userId: 'user-456',
          technologyId: 'tech-789',
          title: '',
          description: 'Description',
          hours,
        });
      }).toThrow('Title is required');
    });

    it('should throw error when title exceeds 200 characters', () => {
      const hours = new TrainingHours(5.0);
      const longTitle = 'a'.repeat(201);
      expect(() => {
        TrainingRecord.create({
          id: '123',
          userId: 'user-456',
          technologyId: 'tech-789',
          title: longTitle,
          description: 'Description',
          hours,
        });
      }).toThrow('Title must not exceed 200 characters');
    });

    it('should accept title with exactly 200 characters', () => {
      const hours = new TrainingHours(5.0);
      const title = 'a'.repeat(200);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title,
        description: 'Description',
        hours,
      });

      expect(record.title).toBe(title);
    });

    it('should throw error when description is empty', () => {
      const hours = new TrainingHours(5.0);
      expect(() => {
        TrainingRecord.create({
          id: '123',
          userId: 'user-456',
          technologyId: 'tech-789',
          title: 'Training',
          description: '',
          hours,
        });
      }).toThrow('Description is required');
    });

    it('should throw error when description exceeds 2000 characters', () => {
      const hours = new TrainingHours(5.0);
      const longDescription = 'a'.repeat(2001);
      expect(() => {
        TrainingRecord.create({
          id: '123',
          userId: 'user-456',
          technologyId: 'tech-789',
          title: 'Training',
          description: longDescription,
          hours,
        });
      }).toThrow('Description must not exceed 2000 characters');
    });

    it('should accept description with exactly 2000 characters', () => {
      const hours = new TrainingHours(5.0);
      const description = 'a'.repeat(2000);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description,
        hours,
      });

      expect(record.description).toBe(description);
    });

    it('should throw error when files exceed 10', () => {
      const hours = new TrainingHours(5.0);
      const files = Array.from({ length: 11 }, (_, i) =>
        TrainingFile.create({
          id: `file-${i}`,
          trainingRecordId: '123',
          originalFilename: `file${i}.pdf`,
          storedFilename: `uuid-${i}.pdf`,
          fileSize: 1024,
          mimeType: 'application/pdf',
        })
      );

      expect(() => {
        TrainingRecord.create({
          id: '123',
          userId: 'user-456',
          technologyId: 'tech-789',
          title: 'Training',
          description: 'Description',
          hours,
          files,
        });
      }).toThrow('Cannot have more than 10 files per training record');
    });

    it('should create a training record with a valid completionDate (YYYY-MM-DD)', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
        completionDate: '2024-06-15',
      });

      expect(record.completionDate).toBe('2024-06-15');
    });

    it('should create a training record with a valid completionDate (YYYY-MM-DDTHH:mm:ss)', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
        completionDate: '2024-06-15T14:30:00',
      });

      expect(record.completionDate).toBe('2024-06-15T14:30:00');
    });

    it('should create a training record with null completionDate', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
        completionDate: null,
      });

      expect(record.completionDate).toBeNull();
    });

    it('should throw ValidationError for invalid completionDate format', () => {
      const hours = new TrainingHours(5.0);
      expect(() => {
        TrainingRecord.create({
          id: '123',
          userId: 'user-456',
          technologyId: 'tech-789',
          title: 'Training',
          description: 'Description',
          hours,
          completionDate: '15/06/2024',
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid date values', () => {
      const hours = new TrainingHours(5.0);
      expect(() => {
        TrainingRecord.create({
          id: '123',
          userId: 'user-456',
          technologyId: 'tech-789',
          title: 'Training',
          description: 'Description',
          hours,
          completionDate: '2024-13-45',
        });
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError for random string as completionDate', () => {
      const hours = new TrainingHours(5.0);
      expect(() => {
        TrainingRecord.create({
          id: '123',
          userId: 'user-456',
          technologyId: 'tech-789',
          title: 'Training',
          description: 'Description',
          hours,
          completionDate: 'not-a-date',
        });
      }).toThrow(ValidationError);
    });
  });

  describe('update', () => {
    it('should update technology ID', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
      });

      record.update({ technologyId: 'tech-999' });

      expect(record.technologyId).toBe('tech-999');
    });

    it('should update title', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Old Title',
        description: 'Description',
        hours,
      });

      record.update({ title: 'New Title' });

      expect(record.title).toBe('New Title');
    });

    it('should update description', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Old Description',
        hours,
      });

      record.update({ description: 'New Description' });

      expect(record.description).toBe('New Description');
    });

    it('should update hours', () => {
      const oldHours = new TrainingHours(5.0);
      const newHours = new TrainingHours(10.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours: oldHours,
      });

      record.update({ hours: newHours });

      expect(record.hours).toBe(newHours);
    });

    it('should update updatedAt timestamp', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
      });

      const originalUpdatedAt = record.updatedAt;
      
      setTimeout(() => {
        record.update({ title: 'New Title' });
        expect(record.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });

    it('should throw error when updating with empty technology ID', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
      });

      expect(() => {
        record.update({ technologyId: '' });
      }).toThrow('Technology ID cannot be empty');
    });

    it('should throw error when updating with empty title', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
      });

      expect(() => {
        record.update({ title: '' });
      }).toThrow('Title cannot be empty');
    });

    it('should throw error when updating with title exceeding 200 characters', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
      });

      expect(() => {
        record.update({ title: 'a'.repeat(201) });
      }).toThrow('Title must not exceed 200 characters');
    });

    it('should throw error when updating with empty description', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
      });

      expect(() => {
        record.update({ description: '' });
      }).toThrow('Description cannot be empty');
    });

    it('should throw error when updating with description exceeding 2000 characters', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
      });

      expect(() => {
        record.update({ description: 'a'.repeat(2001) });
      }).toThrow('Description must not exceed 2000 characters');
    });

    it('should update completionDate with valid ISO 8601 date', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
      });

      record.update({ completionDate: '2024-06-15' });

      expect(record.completionDate).toBe('2024-06-15');
    });

    it('should update completionDate to null', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
        completionDate: '2024-06-15',
      });

      record.update({ completionDate: null });

      expect(record.completionDate).toBeNull();
    });

    it('should throw ValidationError when updating with invalid completionDate', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
      });

      expect(() => {
        record.update({ completionDate: 'bad-date' });
      }).toThrow(ValidationError);
    });
  });

  describe('addFile', () => {
    it('should add a file to the training record', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
      });

      const file = TrainingFile.create({
        id: 'file-1',
        trainingRecordId: '123',
        originalFilename: 'cert.pdf',
        storedFilename: 'uuid-1.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      });

      record.addFile(file);

      expect(record.files).toHaveLength(1);
      expect(record.files[0]).toBe(file);
    });

    it('should throw error when adding more than 10 files', () => {
      const hours = new TrainingHours(5.0);
      const files = Array.from({ length: 10 }, (_, i) =>
        TrainingFile.create({
          id: `file-${i}`,
          trainingRecordId: '123',
          originalFilename: `file${i}.pdf`,
          storedFilename: `uuid-${i}.pdf`,
          fileSize: 1024,
          mimeType: 'application/pdf',
        })
      );

      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
        files,
      });

      const extraFile = TrainingFile.create({
        id: 'file-11',
        trainingRecordId: '123',
        originalFilename: 'extra.pdf',
        storedFilename: 'uuid-11.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      });

      expect(() => {
        record.addFile(extraFile);
      }).toThrow('Cannot add more than 10 files per training record');
    });

    it('should throw error when file does not belong to this record', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
      });

      const file = TrainingFile.create({
        id: 'file-1',
        trainingRecordId: 'different-record',
        originalFilename: 'cert.pdf',
        storedFilename: 'uuid-1.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      });

      expect(() => {
        record.addFile(file);
      }).toThrow('File does not belong to this training record');
    });
  });

  describe('removeFile', () => {
    it('should remove a file from the training record', () => {
      const hours = new TrainingHours(5.0);
      const file = TrainingFile.create({
        id: 'file-1',
        trainingRecordId: '123',
        originalFilename: 'cert.pdf',
        storedFilename: 'uuid-1.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      });

      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
        files: [file],
      });

      record.removeFile('file-1');

      expect(record.files).toHaveLength(0);
    });

    it('should throw error when file not found', () => {
      const hours = new TrainingHours(5.0);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
      });

      expect(() => {
        record.removeFile('non-existent');
      }).toThrow('File not found in training record');
    });
  });

  describe('toJSON', () => {
    it('should serialize training record to JSON', () => {
      const hours = new TrainingHours(5.5);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'React Training',
        description: 'Advanced React patterns',
        hours,
      });

      const json = record.toJSON();

      expect(json).toEqual({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'React Training',
        description: 'Advanced React patterns',
        hours: 5.5,
        completedDate: null,
        completionDate: null,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        files: [],
      });
    });

    it('should serialize training record with files to JSON', () => {
      const hours = new TrainingHours(8.0);
      const file = TrainingFile.create({
        id: 'file-1',
        trainingRecordId: '123',
        originalFilename: 'cert.pdf',
        storedFilename: 'uuid-1.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      });

      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'Training',
        description: 'Description',
        hours,
        files: [file],
      });

      const json = record.toJSON();

      expect(json.files).toHaveLength(1);
      expect(json.files[0]).toEqual(file.toJSON());
    });

    it('should include completionDate in JSON output', () => {
      const hours = new TrainingHours(5.5);
      const record = TrainingRecord.create({
        id: '123',
        userId: 'user-456',
        technologyId: 'tech-789',
        title: 'React Training',
        description: 'Advanced React patterns',
        hours,
        completionDate: '2024-06-15',
      });

      const json = record.toJSON();

      expect(json.completionDate).toBe('2024-06-15');
    });
  });
});
