import { ITrainingRecordRepository } from '../../../domain/repositories/ITrainingRecordRepository';
import { ITechnologyRepository } from '../../../domain/repositories/ITechnologyRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { DateRange } from '../../../domain/value-objects/DateRange';
import { ValidationError } from '../../../shared/errors';

export interface ExportTrainingDataRequest {
  startDate?: Date;
  endDate?: Date;
}

export class ExportTrainingDataUseCase {
  private static readonly CSV_HEADERS = 'Employee Name,Email,Technology,Title,Description,Hours,Completion Date,Date';

  constructor(
    private trainingRecordRepository: ITrainingRecordRepository,
    private technologyRepository: ITechnologyRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(request: ExportTrainingDataRequest): Promise<string> {
    let records;

    if (request.startDate && request.endDate) {
      const dateRange = new DateRange(request.startDate, request.endDate);
      records = await this.trainingRecordRepository.findByDateRange(
        dateRange.getStartDate(),
        dateRange.getEndDate()
      );
    } else if (request.startDate || request.endDate) {
      throw new ValidationError('Both startDate and endDate must be provided for date range filtering');
    } else {
      records = await this.trainingRecordRepository.search({});
    }

    // Build lookup maps
    const users = await this.userRepository.listAll();
    const userMap = new Map<string, { displayName: string; email: string }>();
    for (const user of users) {
      userMap.set(user.id, { displayName: user.getDisplayName(), email: user.email.getValue() });
    }

    const technologies = await this.technologyRepository.listAll();
    const technologyMap = new Map<string, string>();
    for (const tech of technologies) {
      technologyMap.set(tech.id, tech.name);
    }

    // Build CSV rows
    const rows: string[] = [ExportTrainingDataUseCase.CSV_HEADERS];

    for (const record of records) {
      const user = userMap.get(record.userId);
      const technologyName = technologyMap.get(record.technologyId) || 'Unknown';

      rows.push([
        this.escapeCsvField(user?.displayName || 'Unknown'),
        this.escapeCsvField(user?.email || 'Unknown'),
        this.escapeCsvField(technologyName),
        this.escapeCsvField(record.title),
        this.escapeCsvField(record.description),
        record.hours.getValue().toString(),
        record.completionDate || '',
        record.createdAt.toISOString(),
      ].join(','));
    }

    return rows.join('\n');
  }

  private escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}
