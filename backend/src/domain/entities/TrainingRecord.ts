import { TrainingHours } from '../value-objects/TrainingHours';
import { TrainingFile } from './TrainingFile';
import { ValidationError } from '../../shared/errors';

export interface TrainingRecordProps {
  id: string;
  userId: string;
  technologyId: string;
  title: string;
  description: string;
  hours: TrainingHours;
  completedDate: Date | null;
  completionDate: string | null;
  createdAt: Date;
  updatedAt: Date;
  files: TrainingFile[];
}

export class TrainingRecord {
  private static readonly MAX_FILES = 10;
  private static readonly MAX_TITLE_LENGTH = 200;
  private static readonly MAX_DESCRIPTION_LENGTH = 2000;

  private constructor(private props: TrainingRecordProps) {}

  private static readonly ISO_8601_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  private static readonly ISO_8601_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

  static validateCompletionDate(completionDate: string): void {
    const isDateFormat = TrainingRecord.ISO_8601_DATE_REGEX.test(completionDate);
    const isDateTimeFormat = TrainingRecord.ISO_8601_DATETIME_REGEX.test(completionDate);

    if (!isDateFormat && !isDateTimeFormat) {
      throw new ValidationError(
        'Completion date must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)',
        { field: 'completionDate' }
      );
    }

    // Validate the date is actually valid (e.g., not 2024-02-30)
    const parsed = new Date(completionDate);
    if (isNaN(parsed.getTime())) {
      throw new ValidationError(
        'Completion date must be a valid date',
        { field: 'completionDate' }
      );
    }
  }

  static create(params: {
    id: string;
    userId: string;
    technologyId: string;
    title: string;
    description: string;
    hours: TrainingHours;
    completedDate?: Date | null;
    completionDate?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    files?: TrainingFile[];
  }): TrainingRecord {
    // Validate required fields
    if (!params.userId || params.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!params.technologyId || params.technologyId.trim().length === 0) {
      throw new Error('Technology ID is required');
    }

    if (!params.title || params.title.trim().length === 0) {
      throw new Error('Title is required');
    }

    if (params.title.length > TrainingRecord.MAX_TITLE_LENGTH) {
      throw new Error(`Title must not exceed ${TrainingRecord.MAX_TITLE_LENGTH} characters`);
    }

    if (!params.description || params.description.trim().length === 0) {
      throw new Error('Description is required');
    }

    if (params.description.length > TrainingRecord.MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Description must not exceed ${TrainingRecord.MAX_DESCRIPTION_LENGTH} characters`);
    }

    const files = params.files ?? [];
    if (files.length > TrainingRecord.MAX_FILES) {
      throw new Error(`Cannot have more than ${TrainingRecord.MAX_FILES} files per training record`);
    }

    // Validate completionDate if provided
    if (params.completionDate != null && params.completionDate !== '') {
      TrainingRecord.validateCompletionDate(params.completionDate);
    }

    const now = new Date();
    return new TrainingRecord({
      id: params.id,
      userId: params.userId,
      technologyId: params.technologyId,
      title: params.title.trim(),
      description: params.description.trim(),
      hours: params.hours,
      completedDate: params.completedDate ?? null,
      completionDate: params.completionDate ?? null,
      createdAt: params.createdAt ?? now,
      updatedAt: params.updatedAt ?? now,
      files,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get technologyId(): string {
    return this.props.technologyId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get hours(): TrainingHours {
    return this.props.hours;
  }

  get completedDate(): Date | null {
    return this.props.completedDate;
  }

  get completionDate(): string | null {
    return this.props.completionDate;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get files(): TrainingFile[] {
    return [...this.props.files];
  }

  update(params: {
    technologyId?: string;
    title?: string;
    description?: string;
    hours?: TrainingHours;
    completedDate?: Date | null;
    completionDate?: string | null;
  }): void {
    if (params.technologyId !== undefined) {
      if (!params.technologyId || params.technologyId.trim().length === 0) {
        throw new Error('Technology ID cannot be empty');
      }
      this.props.technologyId = params.technologyId;
    }

    if (params.title !== undefined) {
      if (!params.title || params.title.trim().length === 0) {
        throw new Error('Title cannot be empty');
      }
      if (params.title.length > TrainingRecord.MAX_TITLE_LENGTH) {
        throw new Error(`Title must not exceed ${TrainingRecord.MAX_TITLE_LENGTH} characters`);
      }
      this.props.title = params.title.trim();
    }

    if (params.description !== undefined) {
      if (!params.description || params.description.trim().length === 0) {
        throw new Error('Description cannot be empty');
      }
      if (params.description.length > TrainingRecord.MAX_DESCRIPTION_LENGTH) {
        throw new Error(`Description must not exceed ${TrainingRecord.MAX_DESCRIPTION_LENGTH} characters`);
      }
      this.props.description = params.description.trim();
    }

    if (params.hours !== undefined) {
      this.props.hours = params.hours;
    }

    if (params.completedDate !== undefined) {
      this.props.completedDate = params.completedDate;
    }

    if (params.completionDate !== undefined) {
      if (params.completionDate != null && params.completionDate !== '') {
        TrainingRecord.validateCompletionDate(params.completionDate);
      }
      this.props.completionDate = params.completionDate;
    }

    this.props.updatedAt = new Date();
  }

  addFile(file: TrainingFile): void {
    if (this.props.files.length >= TrainingRecord.MAX_FILES) {
      throw new Error(`Cannot add more than ${TrainingRecord.MAX_FILES} files per training record`);
    }

    if (file.trainingRecordId !== this.props.id) {
      throw new Error('File does not belong to this training record');
    }

    this.props.files.push(file);
    this.props.updatedAt = new Date();
  }

  removeFile(fileId: string): void {
    const index = this.props.files.findIndex(f => f.id === fileId);
    if (index === -1) {
      throw new Error('File not found in training record');
    }

    this.props.files.splice(index, 1);
    this.props.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.props.id,
      userId: this.props.userId,
      technologyId: this.props.technologyId,
      title: this.props.title,
      description: this.props.description,
      hours: this.props.hours.getValue(),
      completedDate: this.props.completedDate ? this.props.completedDate.toISOString().split('T')[0] : null,
      completionDate: this.props.completionDate ?? null,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
      files: this.props.files.map(f => f.toJSON()),
    };
  }
}
