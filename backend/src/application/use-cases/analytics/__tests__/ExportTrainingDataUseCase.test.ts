import { ExportTrainingDataUseCase } from '../ExportTrainingDataUseCase';
import { ITrainingRecordRepository, SearchCriteria } from '../../../../domain/repositories/ITrainingRecordRepository';
import { ITechnologyRepository } from '../../../../domain/repositories/ITechnologyRepository';
import { IUserRepository } from '../../../../domain/repositories/IUserRepository';
import { TrainingRecord } from '../../../../domain/entities/TrainingRecord';
import { Technology } from '../../../../domain/entities/Technology';
import { User, UserRole } from '../../../../domain/entities/User';
import { TrainingHours } from '../../../../domain/value-objects/TrainingHours';
import { Email } from '../../../../domain/value-objects/Email';

describe('ExportTrainingDataUseCase', () => {
  let useCase: ExportTrainingDataUseCase;
  let mockTrainingRecordRepo: jest.Mocked<ITrainingRecordRepository>;
  let mockTechnologyRepo: jest.Mocked<ITechnologyRepository>;
  let mockUserRepo: jest.Mocked<IUserRepository>;

  const tech = Technology.create({ id: 'tech-1', name: 'TypeScript', category: 'Programming' });

  const userWithName = User.create({
    id: 'user-1',
    username: 'jdoe',
    firstName: 'John',
    lastName: 'Doe',
    email: new Email('john@example.com'),
    passwordHash: 'hash',
    role: UserRole.EMPLOYEE,
  });

  const userWithoutName = User.create({
    id: 'user-2',
    username: 'janedoe',
    email: new Email('jane@example.com'),
    passwordHash: 'hash',
    role: UserRole.EMPLOYEE,
  });

  const recordWithCompletion = TrainingRecord.create({
    id: 'rec-1',
    userId: 'user-1',
    technologyId: 'tech-1',
    title: 'TS Basics',
    description: 'Learning TypeScript',
    hours: new TrainingHours(8),
    completionDate: '2024-06-15',
    createdAt: new Date('2024-06-01T00:00:00Z'),
    updatedAt: new Date('2024-06-01T00:00:00Z'),
  });

  const recordWithoutCompletion = TrainingRecord.create({
    id: 'rec-2',
    userId: 'user-2',
    technologyId: 'tech-1',
    title: 'Advanced TS',
    description: 'Deep dive',
    hours: new TrainingHours(4),
    createdAt: new Date('2024-07-01T00:00:00Z'),
    updatedAt: new Date('2024-07-01T00:00:00Z'),
  });

  beforeEach(() => {
    mockTrainingRecordRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByUserId: jest.fn(),
      search: jest.fn().mockResolvedValue([recordWithCompletion, recordWithoutCompletion]),
      findByDateRange: jest.fn().mockResolvedValue([recordWithCompletion]),
    };

    mockTechnologyRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      listAll: jest.fn().mockResolvedValue([tech]),
      update: jest.fn(),
      delete: jest.fn(),
    };

    mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      listAll: jest.fn().mockResolvedValue([userWithName, userWithoutName]),
    };

    useCase = new ExportTrainingDataUseCase(mockTrainingRecordRepo, mockTechnologyRepo, mockUserRepo);
  });

  it('should include Completion Date column in CSV header', async () => {
    const csv = await useCase.execute({});
    const header = csv.split('\n')[0];
    expect(header).toBe('Employee Name,Email,Technology,Title,Description,Hours,Completion Date,Date');
  });

  it('should use displayName (firstName + lastName) for employee name', async () => {
    const csv = await useCase.execute({});
    const rows = csv.split('\n');
    // user-1 has firstName=John, lastName=Doe → displayName = "John Doe"
    expect(rows[1]).toContain('John Doe');
  });

  it('should fall back to username when firstName/lastName are empty', async () => {
    const csv = await useCase.execute({});
    const rows = csv.split('\n');
    // user-2 has no firstName/lastName → displayName = "janedoe"
    expect(rows[2]).toContain('janedoe');
  });

  it('should include completionDate value when present', async () => {
    const csv = await useCase.execute({});
    const rows = csv.split('\n');
    // rec-1 has completionDate = '2024-06-15'
    expect(rows[1]).toContain('2024-06-15');
  });

  it('should output empty string for completionDate when null', async () => {
    const csv = await useCase.execute({});
    const rows = csv.split('\n');
    const fields = rows[2].split(',');
    // Completion Date is the 7th column (index 6)
    expect(fields[6]).toBe('');
  });

  it('should have correct number of columns per row', async () => {
    const csv = await useCase.execute({});
    const rows = csv.split('\n');
    // Header has 8 columns
    expect(rows[0].split(',').length).toBe(8);
    // Data rows should also have 8 columns
    expect(rows[1].split(',').length).toBe(8);
    expect(rows[2].split(',').length).toBe(8);
  });

  it('should apply date range filtering', async () => {
    const csv = await useCase.execute({
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-30'),
    });
    const rows = csv.split('\n');
    // Header + 1 record (findByDateRange returns only recordWithCompletion)
    expect(rows.length).toBe(2);
    expect(mockTrainingRecordRepo.findByDateRange).toHaveBeenCalled();
  });
});
