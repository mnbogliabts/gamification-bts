import { TrainingRecord } from '../../../domain/entities/TrainingRecord';
import { UserRole } from '../../../domain/entities/User';
import { ITrainingRecordRepository } from '../../../domain/repositories/ITrainingRecordRepository';
import { ITechnologyRepository } from '../../../domain/repositories/ITechnologyRepository';
import { AnalyticsEngine, TechnologySummary } from '../../../domain/services/AnalyticsEngine';
import { AuthorizationError, ValidationError } from '../../../shared/errors';

export interface GetEmployeeDashboardContext {
  requestingUserId: string;
  requestingUserRole: UserRole;
}

export interface EmployeeDashboardDTO {
  totalHours: number;
  totalRecords: number;
  hoursByTechnology: TechnologySummary[];
  recentRecords: TrainingRecord[];
}

export class GetEmployeeDashboardUseCase {
  constructor(
    private trainingRecordRepository: ITrainingRecordRepository,
    private technologyRepository: ITechnologyRepository,
    private analyticsEngine: AnalyticsEngine
  ) {}

  async execute(userId: string, context: GetEmployeeDashboardContext): Promise<EmployeeDashboardDTO> {
    if (!userId || userId.trim().length === 0) {
      throw new ValidationError('User ID is required');
    }

    // Authorization: employees can only view their own dashboard, admins can view any
    if (context.requestingUserRole !== UserRole.ADMIN && context.requestingUserId !== userId) {
      throw new AuthorizationError('You do not have permission to view this dashboard');
    }

    // Fetch all training records for the user
    const records = await this.trainingRecordRepository.findByUserId(userId);

    // Calculate total hours
    const totalHours = this.analyticsEngine.calculateTotalHours(records);

    // Build technology map from all technologies
    const technologies = await this.technologyRepository.listAll();
    const technologyMap = new Map<string, { name: string; category: string }>();
    for (const tech of technologies) {
      technologyMap.set(tech.id, { name: tech.name, category: tech.category });
    }

    // Group records by technology
    const hoursByTechnology = this.analyticsEngine.groupByTechnology(records, technologyMap);

    // Sort records chronologically (most recent first)
    const recentRecords = [...records].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return {
      totalHours,
      totalRecords: records.length,
      hoursByTechnology,
      recentRecords,
    };
  }
}
