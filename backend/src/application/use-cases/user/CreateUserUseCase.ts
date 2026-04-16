import { v4 as uuidv4 } from 'uuid';
import { User, UserRole, AuthProvider } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { AuthenticationService } from '../../../domain/services/AuthenticationService';
import { ValidationError, ConflictError } from '../../../shared/errors';

export interface CreateUserDTO {
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  role: UserRole;
}

export class CreateUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private authenticationService: AuthenticationService
  ) {}

  async execute(dto: CreateUserDTO): Promise<User> {
    // Validate required fields
    if (!dto.username || dto.username.trim().length === 0) {
      throw new ValidationError('Username is required');
    }
    if (!dto.email || dto.email.trim().length === 0) {
      throw new ValidationError('Email is required');
    }
    if (!dto.password || dto.password.length === 0) {
      throw new ValidationError('Password is required');
    }
    if (!dto.role) {
      throw new ValidationError('Role is required');
    }

    // Validate role
    if (!Object.values(UserRole).includes(dto.role)) {
      throw new ValidationError(`Invalid role: ${dto.role}. Must be ADMIN or EMPLOYEE`);
    }

    // Validate optional firstName/lastName (max 100 chars)
    if (dto.firstName !== undefined && dto.firstName.length > 100) {
      throw new ValidationError('First name must not exceed 100 characters');
    }
    if (dto.lastName !== undefined && dto.lastName.length > 100) {
      throw new ValidationError('Last name must not exceed 100 characters');
    }

    // Create Email value object (validates format)
    const email = new Email(dto.email);

    // Check for existing user with same email
    const existingByEmail = await this.userRepository.findByEmail(email);
    if (existingByEmail) {
      throw new ConflictError('A user with this email already exists');
    }

    // Check for existing user with same username
    const existingByUsername = await this.userRepository.findByUsername(dto.username.trim());
    if (existingByUsername) {
      throw new ConflictError('A user with this username already exists');
    }

    // Hash password using bcrypt with cost factor 10
    const passwordHash = await this.authenticationService.hashPassword(dto.password);

    // Create user entity
    const user = User.create({
      id: uuidv4(),
      username: dto.username.trim(),
      firstName: dto.firstName?.trim() || '',
      lastName: dto.lastName?.trim() || '',
      email,
      passwordHash,
      role: dto.role,
      isActive: true,
      authProvider: AuthProvider.LOCAL,
    });

    // Persist user
    return this.userRepository.create(user);
  }
}
