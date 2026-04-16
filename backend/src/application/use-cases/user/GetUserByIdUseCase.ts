import { User } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { NotFoundError } from '../../../shared/errors';

export interface UserResponseDTO {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  authProvider: string;
  createdAt: string;
  updatedAt: string;
}

export class GetUserByIdUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  /**
   * Execute and return a response DTO with displayName derived from firstName/lastName.
   * Requirements: 3.7
   */
  async executeWithDisplayName(userId: string): Promise<UserResponseDTO> {
    const user = await this.execute(userId);
    return user.toJSON() as UserResponseDTO;
  }
}
