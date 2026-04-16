import { getDatabasePool } from '../connection';
import { TrainingFile } from '../../../domain/entities/TrainingFile';
import { ITrainingFileRepository } from '../../../domain/repositories/ITrainingFileRepository';

/**
 * PostgreSQL implementation of TrainingFileRepository
 * Requirements: 5.4
 */
export class TrainingFileRepository implements ITrainingFileRepository {
  async create(file: TrainingFile): Promise<TrainingFile> {
    const pool = getDatabasePool();
    const query = `
      INSERT INTO training_files (id, training_record_id, original_filename, stored_filename, file_size, mime_type, uploaded_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      file.id,
      file.trainingRecordId,
      file.originalFilename,
      file.storedFilename,
      file.fileSize,
      file.mimeType,
      file.uploadedAt
    ];

    const result = await pool.query(query, values);
    return this.mapRowToTrainingFile(result.rows[0]);
  }

  async findById(id: string): Promise<TrainingFile | null> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM training_files WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTrainingFile(result.rows[0]);
  }

  async findByTrainingRecordId(trainingRecordId: string): Promise<TrainingFile[]> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM training_files WHERE training_record_id = $1 ORDER BY uploaded_at DESC';
    const result = await pool.query(query, [trainingRecordId]);
    
    return result.rows.map(row => this.mapRowToTrainingFile(row));
  }

  async delete(id: string): Promise<void> {
    const pool = getDatabasePool();
    const query = 'DELETE FROM training_files WHERE id = $1';
    await pool.query(query, [id]);
  }

  private mapRowToTrainingFile(row: any): TrainingFile {
    return TrainingFile.create({
      id: row.id,
      trainingRecordId: row.training_record_id,
      originalFilename: row.original_filename,
      storedFilename: row.stored_filename,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      uploadedAt: new Date(row.uploaded_at)
    });
  }
}
