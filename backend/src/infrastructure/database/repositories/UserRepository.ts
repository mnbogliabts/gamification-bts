import { getDatabasePool } from '../connection';
import { User, UserRole, AuthProvider } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';

/**
 * PostgreSQL implementation of UserRepository
 * Requirements: 3.1, 4.1
 */
export class UserRepository implements IUserRepository {
  async create(user: User): Promise<User> {
    const pool = getDatabasePool();
    const query = `
      INSERT INTO users (id, username, first_name, last_name, email, password_hash, role, is_active, auth_provider, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      user.id,
      user.username,
      user.firstName,
      user.lastName,
      user.email.getValue(),
      user.passwordHash,
      user.role,
      user.isActive,
      user.authProvider,
      user.createdAt,
      user.updatedAt
    ];

    const result = await pool.query(query, values);
    return this.mapRowToUser(result.rows[0]);
  }

  async findById(id: string): Promise<User | null> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email.getValue()]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async findByUsername(username: string): Promise<User | null> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async update(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
    const pool = getDatabasePool();
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.username !== undefined) {
      setClauses.push(`username = $${paramIndex++}`);
      values.push(updates.username);
    }

    if ((updates as any).firstName !== undefined) {
      setClauses.push(`first_name = $${paramIndex++}`);
      values.push((updates as any).firstName);
    }

    if ((updates as any).lastName !== undefined) {
      setClauses.push(`last_name = $${paramIndex++}`);
      values.push((updates as any).lastName);
    }

    if (updates.email !== undefined) {
      setClauses.push(`email = $${paramIndex++}`);
      values.push((updates.email as any).getValue ? (updates.email as any).getValue() : updates.email);
    }

    if (updates.passwordHash !== undefined) {
      setClauses.push(`password_hash = $${paramIndex++}`);
      values.push(updates.passwordHash);
    }

    if (updates.role !== undefined) {
      setClauses.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }

    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    setClauses.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(id);

    const query = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return this.mapRowToUser(result.rows[0]);
  }

  async deactivate(id: string): Promise<void> {
    const pool = getDatabasePool();
    const query = `
      UPDATE users
      SET is_active = false, updated_at = $1
      WHERE id = $2
    `;
    
    await pool.query(query, [new Date(), id]);
  }

  async listAll(): Promise<User[]> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    const result = await pool.query(query);
    
    return result.rows.map(row => this.mapRowToUser(row));
  }

  private mapRowToUser(row: any): User {
    return User.create({
      id: row.id,
      username: row.username,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      email: new Email(row.email),
      passwordHash: row.password_hash,
      role: row.role as UserRole,
      isActive: row.is_active,
      authProvider: row.auth_provider as AuthProvider,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }
}
