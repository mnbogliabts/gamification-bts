import { ITrainingRecordRepository } from '../../../domain/repositories/ITrainingRecordRepository';
import { ITechnologyRepository } from '../../../domain/repositories/ITechnologyRepository';
import { AnalyticsEngine, TechnologySummary } from '../../../domain/services/AnalyticsEngine';
import { DateRange } from '../../../domain/value-objects/DateRange';
import { ValidationError } from '../../../shared/errors';

export interface GetTechnologyAnalyticsRequest {
  startDate?: Date;
  endDate?: Date;
}

export class GetTechnologyAnalyticsUseCase {
  constructor(
    private trainingRecordRepository: ITrainingRecordRepository,
    private technologyRepository: ITechnologyRepository,
    private analyticsEngine: AnalyticsEngine
  ) {}

  async execute(request: GetTechnologyAnalyticsRequest): Promise<TechnologySummary[]> {
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

    const technologies = await this.technologyRepository.listAll();
    const technologyMap = new Map<string, { name: string; category: string }>();
    for (const tech of technologies) {
      technologyMap.set(tech.id, { name: tech.name, category: tech.category });
    }

    return this.analyticsEngine.groupByTechnology(records, technologyMap);
  }
}
