import { getDatabasePool } from '../connection';
import { Technology } from '../../../domain/entities/Technology';
import { ITechnologyRepository } from '../../../domain/repositories/ITechnologyRepository';

/**
 * PostgreSQL implementation of TechnologyRepository
 * Requirements: 4.1
 */
export class TechnologyRepository implements ITechnologyRepository {
  async create(technology: Technology): Promise<Technology> {
    const pool = getDatabasePool();
    const query = `
      INSERT INTO technologies (id, name, category, created_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const values = [
      technology.id,
      technology.name,
      technology.category,
      technology.createdAt
    ];

    const result = await pool.query(query, values);
    return this.mapRowToTechnology(result.rows[0]);
  }

  async findById(id: string): Promise<Technology | null> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM technologies WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTechnology(result.rows[0]);
  }

  async findByName(name: string): Promise<Technology | null> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM technologies WHERE name = $1';
    const result = await pool.query(query, [name]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTechnology(result.rows[0]);
  }

  async listAll(): Promise<Technology[]> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM technologies ORDER BY name ASC';
    const result = await pool.query(query);
    
    return result.rows.map(row => this.mapRowToTechnology(row));
  }

  async update(id: string, updates: Partial<Omit<Technology, 'id' | 'createdAt'>>): Promise<Technology> {
    const pool = getDatabasePool();
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.category !== undefined) {
      setClauses.push(`category = $${paramIndex++}`);
      values.push(updates.category);
    }

    if (setClauses.length === 0) {
      throw new Error('No updates provided');
    }

    values.push(id);

    const query = `
      UPDATE technologies
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error(`Technology with id ${id} not found`);
    }
    
    return this.mapRowToTechnology(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const pool = getDatabasePool();
    const query = 'DELETE FROM technologies WHERE id = $1';
    await pool.query(query, [id]);
  }

  private mapRowToTechnology(row: any): Technology {
    return Technology.create({
      id: row.id,
      name: row.name,
      category: row.category,
      createdAt: new Date(row.created_at)
    });
  }
}
