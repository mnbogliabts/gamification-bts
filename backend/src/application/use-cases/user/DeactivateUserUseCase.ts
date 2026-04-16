import { v4 as uuidv4 } from 'uuid';
import { AuditLog, AuditAction } from '../../../domain/entities/AuditLog';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { NotFoundError } from '../../../shared/errors';

export interface DeactivateUserContext {
  performedByUserId: string;
  ipAddress?: string;
}

export class DeactivateUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private auditLogRepository: IAuditLogRepository
  ) {}

  async execute(userId: string, context: DeactivateUserContext): Promise<void> {
    // Find existing user
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Deactivate user - prevents authentication
    await this.userRepository.deactivate(userId);

    // Create audit log entry
    const auditLog = AuditLog.create({
      id: uuidv4(),
      userId: context.performedByUserId,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: userId,
      changes: { isActive: { from: existingUser.isActive, to: false } },
      ipAddress: context.ipAddress ?? null,
    });

    await this.auditLogRepository.create(auditLog);
  }
}
