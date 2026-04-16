/**
 * Simple dependency injection container.
 * Instantiates repositories, domain services, and use cases.
 */
import { UserRepository } from '../infrastructure/database/repositories/UserRepository';
import { TechnologyRepository } from '../infrastructure/database/repositories/TechnologyRepository';
import { TrainingRecordRepository } from '../infrastructure/database/repositories/TrainingRecordRepository';
import { TrainingFileRepository } from '../infrastructure/database/repositories/TrainingFileRepository';
import { AuditLogRepository } from '../infrastructure/database/repositories/AuditLogRepository';
import { SessionRepository } from '../infrastructure/database/repositories/SessionRepository';

import { AuthenticationService } from '../domain/services/AuthenticationService';
import { TokenManagementService } from '../domain/services/TokenManagementService';
import { AuthorizationService } from '../domain/services/AuthorizationService';
import { AnalyticsEngine } from '../domain/services/AnalyticsEngine';
import { LocalFileStorageService } from '../infrastructure/storage/LocalFileStorageService';

import { LoginWithCredentialsUseCase } from '../application/use-cases/auth/LoginWithCredentialsUseCase';
import { LoginWithGoogleOAuthUseCase } from '../application/use-cases/auth/LoginWithGoogleOAuthUseCase';
import { LogoutUseCase } from '../application/use-cases/auth/LogoutUseCase';
import { RefreshTokenUseCase } from '../application/use-cases/auth/RefreshTokenUseCase';

import { CreateUserUseCase } from '../application/use-cases/user/CreateUserUseCase';
import { UpdateUserUseCase } from '../application/use-cases/user/UpdateUserUseCase';
import { DeactivateUserUseCase } from '../application/use-cases/user/DeactivateUserUseCase';
import { GetUserByIdUseCase } from '../application/use-cases/user/GetUserByIdUseCase';
import { ListUsersUseCase } from '../application/use-cases/user/ListUsersUseCase';

import { CreateTrainingRecordUseCase } from '../application/use-cases/training-record/CreateTrainingRecordUseCase';
import { UpdateTrainingRecordUseCase } from '../application/use-cases/training-record/UpdateTrainingRecordUseCase';
import { DeleteTrainingRecordUseCase } from '../application/use-cases/training-record/DeleteTrainingRecordUseCase';
import { GetTrainingRecordUseCase } from '../application/use-cases/training-record/GetTrainingRecordUseCase';
import { SearchTrainingRecordsUseCase } from '../application/use-cases/training-record/SearchTrainingRecordsUseCase';
import { UploadTrainingFileUseCase } from '../application/use-cases/training-record/UploadTrainingFileUseCase';
import { DeleteTrainingFileUseCase } from '../application/use-cases/training-record/DeleteTrainingFileUseCase';
import { DownloadTrainingFileUseCase } from '../application/use-cases/training-record/DownloadTrainingFileUseCase';

import { GetEmployeeDashboardUseCase } from '../application/use-cases/analytics/GetEmployeeDashboardUseCase';
import { GetAdminAnalyticsUseCase } from '../application/use-cases/analytics/GetAdminAnalyticsUseCase';
import { GetLeaderboardUseCase } from '../application/use-cases/analytics/GetLeaderboardUseCase';
import { GetTechnologyAnalyticsUseCase } from '../application/use-cases/analytics/GetTechnologyAnalyticsUseCase';
import { ExportTrainingDataUseCase } from '../application/use-cases/analytics/ExportTrainingDataUseCase';

// --- Repositories ---
export const userRepository = new UserRepository();
export const technologyRepository = new TechnologyRepository();
export const trainingRecordRepository = new TrainingRecordRepository();
export const trainingFileRepository = new TrainingFileRepository();
export const auditLogRepository = new AuditLogRepository();
export const sessionRepository = new SessionRepository();

// --- Domain Services ---
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
export const authenticationService = new AuthenticationService(jwtSecret);
export const tokenManagementService = new TokenManagementService(sessionRepository, authenticationService);
export const authorizationService = new AuthorizationService();
export const analyticsEngine = new AnalyticsEngine();
export const fileStorageService = new LocalFileStorageService(
  process.env.UPLOAD_PATH || './uploads',
  process.env.URL_SIGNING_SECRET
);

// --- Auth Use Cases ---
export const loginWithCredentialsUseCase = new LoginWithCredentialsUseCase(
  userRepository, authenticationService, tokenManagementService, auditLogRepository
);
export const loginWithGoogleOAuthUseCase = new LoginWithGoogleOAuthUseCase(
  userRepository, authenticationService, tokenManagementService, auditLogRepository
);
export const logoutUseCase = new LogoutUseCase(tokenManagementService, auditLogRepository);
export const refreshTokenUseCase = new RefreshTokenUseCase(userRepository, tokenManagementService);

// --- User Use Cases ---
export const createUserUseCase = new CreateUserUseCase(userRepository, authenticationService);
export const updateUserUseCase = new UpdateUserUseCase(userRepository, auditLogRepository, authenticationService);
export const deactivateUserUseCase = new DeactivateUserUseCase(userRepository, auditLogRepository);
export const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
export const listUsersUseCase = new ListUsersUseCase(userRepository, authorizationService);

// --- Training Record Use Cases ---
export const createTrainingRecordUseCase = new CreateTrainingRecordUseCase(trainingRecordRepository, auditLogRepository);
export const updateTrainingRecordUseCase = new UpdateTrainingRecordUseCase(trainingRecordRepository, auditLogRepository);
export const deleteTrainingRecordUseCase = new DeleteTrainingRecordUseCase(
  trainingRecordRepository, trainingFileRepository, auditLogRepository, fileStorageService
);
export const getTrainingRecordUseCase = new GetTrainingRecordUseCase(trainingRecordRepository, userRepository);
export const searchTrainingRecordsUseCase = new SearchTrainingRecordsUseCase(trainingRecordRepository);
export const uploadTrainingFileUseCase = new UploadTrainingFileUseCase(
  trainingRecordRepository, trainingFileRepository, fileStorageService
);
export const deleteTrainingFileUseCase = new DeleteTrainingFileUseCase(trainingFileRepository, fileStorageService);
export const downloadTrainingFileUseCase = new DownloadTrainingFileUseCase(
  trainingFileRepository, trainingRecordRepository, fileStorageService
);

// --- Analytics Use Cases ---
export const getEmployeeDashboardUseCase = new GetEmployeeDashboardUseCase(
  trainingRecordRepository, technologyRepository, analyticsEngine
);
export const getAdminAnalyticsUseCase = new GetAdminAnalyticsUseCase(
  trainingRecordRepository, technologyRepository, analyticsEngine
);
export const getLeaderboardUseCase = new GetLeaderboardUseCase(
  trainingRecordRepository, userRepository, analyticsEngine
);
export const getTechnologyAnalyticsUseCase = new GetTechnologyAnalyticsUseCase(
  trainingRecordRepository, technologyRepository, analyticsEngine
);
export const exportTrainingDataUseCase = new ExportTrainingDataUseCase(
  trainingRecordRepository, technologyRepository, userRepository
);
