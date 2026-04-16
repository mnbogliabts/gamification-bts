import { User } from '../entities/User';
import { Email } from '../value-objects/Email';

/**
 * Repository interface for User entity
 * Requirements: 3.1, 4.1
 */
export interface IUserRepository {
  create(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  update(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User>;
  deactivate(id: string): Promise<void>;
  listAll(): Promise<User[]>;
}
