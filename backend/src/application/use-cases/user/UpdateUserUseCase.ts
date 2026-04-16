import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../../../domain/entities/User';
import { AuditLog, AuditAction } from '../../../domain/entities/AuditLog';
import { Email } from '../../../domain/value-objects/Email';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { AuthenticationService } from '../../../domain/services/AuthenticationService';
import { ValidationError, NotFoundError, ConflictError } from '../../../shared/errors';

export interface UpdateUserDTO {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

export interface UpdateUserContext {
  performedByUserId: string;
  ipAddress?: string;
}

export class UpdateUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private auditLogRepository: IAuditLogRepository,
    private authenticationService: AuthenticationService
  ) {}

  async execute(userId: string, dto: UpdateUserDTO, context: UpdateUserContext): Promise<User> {
    // Find existing user
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Track changes for audit log
    const changes: Record<string, { from: any; to: any }> = {};

    // Build updates object
    const updates: Record<string, any> = {};

    if (dto.username !== undefined) {
      if (!dto.username || dto.username.trim().length === 0) {
        throw new ValidationError('Username cannot be empty');
      }
      const trimmedUsername = dto.username.trim();
      if (trimmedUsername !== existingUser.username) {
        const existingByUsername = await this.userRepository.findByUsername(trimmedUsername);
        if (existingByUsername) {
          throw new ConflictError('A user with this username already exists');
        }
        changes.username = { from: existingUser.username, to: trimmedUsername };
        updates.username = trimmedUsername;
      }
    }

    if (dto.firstName !== undefined) {
      if (dto.firstName.length > 100) {
        throw new ValidationError('First name must not exceed 100 characters');
      }
      if (dto.firstName !== existingUser.firstName) {
        changes.firstName = { from: existingUser.firstName, to: dto.firstName };
        updates.firstName = dto.firstName;
      }
    }

    if (dto.lastName !== undefined) {
      if (dto.lastName.length > 100) {
        throw new ValidationError('Last name must not exceed 100 characters');
      }
      if (dto.lastName !== existingUser.lastName) {
        changes.lastName = { from: existingUser.lastName, to: dto.lastName };
        updates.lastName = dto.lastName;
      }
    }

    if (dto.email !== undefined) {
      if (!dto.email || dto.email.trim().length === 0) {
        throw new ValidationError('Email cannot be empty');
      }
      const newEmail = new Email(dto.email);
      if (!newEmail.equals(existingUser.email)) {
        const existingByEmail = await this.userRepository.findByEmail(newEmail);
        if (existingByEmail) {
          throw new ConflictError('A user with this email already exists');
        }
        changes.email = { from: existingUser.email.getValue(), to: newEmail.getValue() };
        updates.email = newEmail;
      }
    }

    if (dto.role !== undefined) {
      if (!Object.values(UserRole).includes(dto.role)) {
        throw new ValidationError(`Invalid role: ${dto.role}. Must be ADMIN or EMPLOYEE`);
      }
      if (dto.role !== existingUser.role) {
        changes.role = { from: existingUser.role, to: dto.role };
        updates.role = dto.role;
      }
    }

    if (dto.password !== undefined) {
      if (!dto.password || dto.password.length === 0) {
        throw new ValidationError('Password cannot be empty');
      }
      const passwordHash = await this.authenticationService.hashPassword(dto.password);
      changes.password = { from: '[REDACTED]', to: '[REDACTED]' };
      updates.passwordHash = passwordHash;
    }

    // Only update if there are changes
    if (Object.keys(updates).length === 0) {
      return existingUser;
    }

    // Persist updates
    const updatedUser = await this.userRepository.update(userId, updates);

    // Create audit log entry
    const auditLog = AuditLog.create({
      id: uuidv4(),
      userId: context.performedByUserId,
      action: AuditAction.UPDATE,
      entityType: 'User',
      entityId: userId,
      changes,
      ipAddress: context.ipAddress ?? null,
    });

    await this.auditLogRepository.create(auditLog);

    return updatedUser;
  }
}
