import { ITrainingRecordRepository } from '../../../domain/repositories/ITrainingRecordRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { AnalyticsEngine, EmployeeRanking } from '../../../domain/services/AnalyticsEngine';
import { DateRange } from '../../../domain/value-objects/DateRange';
import { ValidationError } from '../../../shared/errors';

export interface GetLeaderboardRequest {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class GetLeaderboardUseCase {
  private static readonly DEFAULT_LIMIT = 10;

  constructor(
    private trainingRecordRepository: ITrainingRecordRepository,
    private userRepository: IUserRepository,
    private analyticsEngine: AnalyticsEngine
  ) {}

  async execute(request: GetLeaderboardRequest): Promise<EmployeeRanking[]> {
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

    // Build user map
    const users = await this.userRepository.listAll();
    const userMap = new Map<string, { username: string; displayName: string; email: string }>();
    for (const user of users) {
      userMap.set(user.id, {
        username: user.username,
        displayName: user.getDisplayName(),
        email: user.email.getValue(),
      });
    }

    const rankings = this.analyticsEngine.rankEmployees(records, userMap);

    // Return at least DEFAULT_LIMIT entries or all if fewer
    const limit = request.limit ?? GetLeaderboardUseCase.DEFAULT_LIMIT;
    const minEntries = Math.max(limit, GetLeaderboardUseCase.DEFAULT_LIMIT);

    return rankings.length <= minEntries ? rankings : rankings.slice(0, minEntries);
  }
}
