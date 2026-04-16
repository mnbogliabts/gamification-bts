import { User } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { AuthorizationService } from '../../../domain/services/AuthorizationService';
import { AuthorizationError } from '../../../shared/errors';
import { UserResponseDTO } from './GetUserByIdUseCase';

export class ListUsersUseCase {
  constructor(
    private userRepository: IUserRepository,
    private authorizationService: AuthorizationService
  ) {}

  async execute(requestingUser: User): Promise<User[]> {
    // Only admins can list all users
    if (!this.authorizationService.isAdmin(requestingUser)) {
      throw new AuthorizationError('Only administrators can list all users');
    }

    return this.userRepository.listAll();
  }

  /**
   * Execute and return response DTOs with displayName derived from firstName/lastName.
   * Requirements: 3.7
   */
  async executeWithDisplayName(requestingUser: User): Promise<UserResponseDTO[]> {
    const users = await this.execute(requestingUser);
    return users.map(user => user.toJSON() as UserResponseDTO);
  }
}
