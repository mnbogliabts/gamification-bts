import { AuditLog, AuditAction } from '../AuditLog';

describe('AuditLog Entity', () => {
  describe('create', () => {
    it('should create an audit log with all required fields', () => {
      const log = AuditLog.create({
        id: '123',
        userId: 'user-456',
        action: AuditAction.CREATE,
        entityType: 'TrainingRecord',
        entityId: 'record-789',
        changes: { title: 'New Training' },
        ipAddress: '192.168.1.1',
      });

      expect(log.id).toBe('123');
      expect(log.userId).toBe('user-456');
      expect(log.action).toBe(AuditAction.CREATE);
      expect(log.entityType).toBe('TrainingRecord');
      expect(log.entityId).toBe('record-789');
      expect(log.changes).toEqual({ title: 'New Training' });
      expect(log.ipAddress).toBe('192.168.1.1');
      expect(log.timestamp).toBeInstanceOf(Date);
    });

    it('should create an audit log with null userId', () => {
      const log = AuditLog.create({
        id: '123',
        userId: null,
        action: AuditAction.LOGIN,
        entityType: 'User',
      });

      expect(log.userId).toBeNull();
    });

    it('should create an audit log with null entityId', () => {
      const log = AuditLog.create({
        id: '123',
        userId: 'user-456',
        action: AuditAction.LOGIN,
        entityType: 'User',
        entityId: null,
      });

      expect(log.entityId).toBeNull();
    });

    it('should create an audit log with null changes', () => {
      const log = AuditLog.create({
        id: '123',
        userId: 'user-456',
        action: AuditAction.DELETE,
        entityType: 'TrainingRecord',
        entityId: 'record-789',
        changes: null,
      });

      expect(log.changes).toBeNull();
    });

    it('should create an audit log with null ipAddress', () => {
      const log = AuditLog.create({
        id: '123',
        userId: 'user-456',
        action: AuditAction.UPDATE,
        entityType: 'User',
        entityId: 'user-789',
        ipAddress: null,
      });

      expect(log.ipAddress).toBeNull();
    });

    it('should create an audit log with custom timestamp', () => {
      const timestamp = new Date('2024-01-01');
      const log = AuditLog.create({
        id: '123',
        userId: 'user-456',
        action: AuditAction.CREATE,
        entityType: 'TrainingRecord',
        timestamp,
      });

      expect(log.timestamp).toBe(timestamp);
    });

    it('should accept CREATE action', () => {
      const log = AuditLog.create({
        id: '1',
        userId: 'user-1',
        action: AuditAction.CREATE,
        entityType: 'TrainingRecord',
      });

      expect(log.action).toBe(AuditAction.CREATE);
    });

    it('should accept UPDATE action', () => {
      const log = AuditLog.create({
        id: '2',
        userId: 'user-2',
        action: AuditAction.UPDATE,
        entityType: 'TrainingRecord',
      });

      expect(log.action).toBe(AuditAction.UPDATE);
    });

    it('should accept DELETE action', () => {
      const log = AuditLog.create({
        id: '3',
        userId: 'user-3',
        action: AuditAction.DELETE,
        entityType: 'TrainingRecord',
      });

      expect(log.action).toBe(AuditAction.DELETE);
    });

    it('should accept LOGIN action', () => {
      const log = AuditLog.create({
        id: '4',
        userId: 'user-4',
        action: AuditAction.LOGIN,
        entityType: 'User',
      });

      expect(log.action).toBe(AuditAction.LOGIN);
    });

    it('should accept LOGOUT action', () => {
      const log = AuditLog.create({
        id: '5',
        userId: 'user-5',
        action: AuditAction.LOGOUT,
        entityType: 'User',
      });

      expect(log.action).toBe(AuditAction.LOGOUT);
    });

    it('should throw error when action is missing', () => {
      expect(() => {
        AuditLog.create({
          id: '123',
          userId: 'user-456',
          action: undefined as any,
          entityType: 'TrainingRecord',
        });
      }).toThrow('Action is required');
    });

    it('should throw error when action is invalid', () => {
      expect(() => {
        AuditLog.create({
          id: '123',
          userId: 'user-456',
          action: 'INVALID_ACTION' as any,
          entityType: 'TrainingRecord',
        });
      }).toThrow('Invalid action');
    });

    it('should throw error when entityType is empty', () => {
      expect(() => {
        AuditLog.create({
          id: '123',
          userId: 'user-456',
          action: AuditAction.CREATE,
          entityType: '',
        });
      }).toThrow('Entity type is required');
    });

    it('should throw error when entityType is only whitespace', () => {
      expect(() => {
        AuditLog.create({
          id: '123',
          userId: 'user-456',
          action: AuditAction.CREATE,
          entityType: '   ',
        });
      }).toThrow('Entity type is required');
    });

    it('should trim whitespace from entityType', () => {
      const log = AuditLog.create({
        id: '123',
        userId: 'user-456',
        action: AuditAction.CREATE,
        entityType: '  TrainingRecord  ',
      });

      expect(log.entityType).toBe('TrainingRecord');
    });
  });

  describe('changes getter', () => {
    it('should return a copy of changes object', () => {
      const originalChanges = { title: 'New Training', hours: 5 };
      const log = AuditLog.create({
        id: '123',
        userId: 'user-456',
        action: AuditAction.UPDATE,
        entityType: 'TrainingRecord',
        changes: originalChanges,
      });

      const changes = log.changes;
      expect(changes).toEqual(originalChanges);
      expect(changes).not.toBe(originalChanges); // Should be a copy
    });

    it('should return null when changes is null', () => {
      const log = AuditLog.create({
        id: '123',
        userId: 'user-456',
        action: AuditAction.DELETE,
        entityType: 'TrainingRecord',
        changes: null,
      });

      expect(log.changes).toBeNull();
    });
  });

  describe('toJSON', () => {
    it('should serialize audit log to JSON', () => {
      const log = AuditLog.create({
        id: '123',
        userId: 'user-456',
        action: AuditAction.CREATE,
        entityType: 'TrainingRecord',
        entityId: 'record-789',
        changes: { title: 'New Training' },
        ipAddress: '192.168.1.1',
      });

      const json = log.toJSON();

      expect(json).toEqual({
        id: '123',
        userId: 'user-456',
        action: AuditAction.CREATE,
        entityType: 'TrainingRecord',
        entityId: 'record-789',
        changes: { title: 'New Training' },
        ipAddress: '192.168.1.1',
        timestamp: expect.any(String),
      });
    });

    it('should serialize audit log with null values to JSON', () => {
      const log = AuditLog.create({
        id: '123',
        userId: null,
        action: AuditAction.LOGIN,
        entityType: 'User',
        entityId: null,
        changes: null,
        ipAddress: null,
      });

      const json = log.toJSON();

      expect(json).toEqual({
        id: '123',
        userId: null,
        action: AuditAction.LOGIN,
        entityType: 'User',
        entityId: null,
        changes: null,
        ipAddress: null,
        timestamp: expect.any(String),
      });
    });
  });
});
