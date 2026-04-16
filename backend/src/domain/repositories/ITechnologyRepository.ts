import { Technology } from '../entities/Technology';

/**
 * Repository interface for Technology entity
 * Requirements: 4.1
 */
export interface ITechnologyRepository {
  create(technology: Technology): Promise<Technology>;
  findById(id: string): Promise<Technology | null>;
  findByName(name: string): Promise<Technology | null>;
  listAll(): Promise<Technology[]>;
  update(id: string, updates: Partial<Omit<Technology, 'id' | 'createdAt'>>): Promise<Technology>;
  delete(id: string): Promise<void>;
}
