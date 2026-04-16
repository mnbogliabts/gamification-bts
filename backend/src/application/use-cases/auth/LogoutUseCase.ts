import { v4 as uuidv4 } from 'uuid';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { TokenManagementService } from '../../../domain/services/TokenManagementService';
import { AuditLog, AuditAction } from '../../../domain/entities/AuditLog';
import { ValidationError } from '../../../shared/errors';

export interface LogoutDTO {
  token: string;
  userId: string;
  ipAddress?: string;
}

/**
 * Use case for logging out and invalidating the session token
 * Validates: Requirements 1.9, 17.2
 */
export class LogoutUseCase {
  constructor(
    private tokenManagementService: TokenManagementService,
    private auditLogRepository: IAuditLogRepository
  ) {}

  async execute(dto: LogoutDTO): Promise<void> {
    // Validate required fields
    if (!dto.token || dto.token.trim().length === 0) {
      throw new ValidationError('Token is required');
    }
    if (!dto.userId || dto.userId.trim().length === 0) {
      throw new ValidationError('User ID is required');
    }

    // Invalidate the token (Requirement 1.9)
    await this.tokenManagementService.invalidateToken(dto.token);

    // Log logout event (Requirement 17.2)
    const auditLog = AuditLog.create({
      id: uuidv4(),
      userId: dto.userId,
      action: AuditAction.LOGOUT,
      entityType: 'Session',
      entityId: null,
      changes: null,
      ipAddress: dto.ipAddress ?? null,
    });
    await this.auditLogRepository.create(auditLog);
  }
}
