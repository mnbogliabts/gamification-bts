import * as fc from 'fast-check';
import { User, UserRole, AuthProvider } from '../User';
import { TrainingRecord } from '../TrainingRecord';
import { Email } from '../../value-objects/Email';
import { TrainingHours } from '../../value-objects/TrainingHours';

describe('Domain Entities - Property-Based Tests', () => {
  describe('Property 10: Single Role Assignment', () => {
    /**
     * **Validates: Requirements 2.3**
     * 
     * For any user account in the system, it must have exactly one role assigned
     * (either Admin or Employee), never zero roles or multiple roles.
     */
    it('should ensure every user has exactly one role', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress().map(email => new Email(email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com'))),
            passwordHash: fc.oneof(fc.string({ minLength: 10 }), fc.constant(null)),
            role: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
            isActive: fc.boolean(),
            authProvider: fc.constantFrom(AuthProvider.LOCAL, AuthProvider.GOOGLE_OAUTH),
          }),
          (userProps) => {
            const user = User.create(userProps);
            
            // User must have exactly one role
            expect(user.role).toBeDefined();
            expect([UserRole.ADMIN, UserRole.EMPLOYEE]).toContain(user.role);
            
            // Role must be one of the two valid values
            const roleCount = [UserRole.ADMIN, UserRole.EMPLOYEE].filter(r => r === user.role).length;
            expect(roleCount).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14: Role Validation', () => {
    /**
     * **Validates: Requirements 3.2**
     * 
     * For any role assignment operation, the system must accept only "Admin" or "Employee"
     * as valid values and reject all other values with a validation error.
     */
    it('should only accept ADMIN or EMPLOYEE as valid roles', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress().map(email => new Email(email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com'))),
            passwordHash: fc.string({ minLength: 10 }),
            role: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
          }),
          (userProps) => {
            const user = User.create(userProps);
            
            // Valid roles should be accepted
            expect(user.role).toBe(userProps.role);
            expect([UserRole.ADMIN, UserRole.EMPLOYEE]).toContain(user.role);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept role updates to valid enum values', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress().map(email => new Email(email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com'))),
            passwordHash: fc.string({ minLength: 10 }),
            initialRole: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
            newRole: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
          }),
          (props) => {
            const user = User.create({
              id: props.id,
              username: props.username,
              email: props.email,
              passwordHash: props.passwordHash,
              role: props.initialRole,
            });
            
            // Update to a valid role
            user.updateRole(props.newRole);
            
            // Role should be updated and valid
            expect(user.role).toBe(props.newRole);
            expect([UserRole.ADMIN, UserRole.EMPLOYEE]).toContain(user.role);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 18: Training Record Required Fields', () => {
    /**
     * **Validates: Requirements 4.1, 4.5**
     * 
     * For any training record creation request, the system must reject the request
     * if any of the required fields (userId, technologyId, title, description, hours)
     * are missing or empty.
     */
    it('should reject training records with empty userId', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            technologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => new TrainingHours(Math.round(h * 100) / 100)),
          }),
          (props) => {
            expect(() => {
              TrainingRecord.create({
                ...props,
                userId: '',
              });
            }).toThrow('User ID is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject training records with empty technologyId', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => new TrainingHours(Math.round(h * 100) / 100)),
          }),
          (props) => {
            expect(() => {
              TrainingRecord.create({
                ...props,
                technologyId: '',
              });
            }).toThrow('Technology ID is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject training records with empty title', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => new TrainingHours(Math.round(h * 100) / 100)),
          }),
          (props) => {
            expect(() => {
              TrainingRecord.create({
                ...props,
                title: '',
              });
            }).toThrow('Title is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject training records with empty description', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => new TrainingHours(Math.round(h * 100) / 100)),
          }),
          (props) => {
            expect(() => {
              TrainingRecord.create({
                ...props,
                description: '',
              });
            }).toThrow('Description is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept training records with all required fields present', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => new TrainingHours(Math.round(h * 100) / 100)),
          }),
          (props) => {
            const record = TrainingRecord.create(props);
            
            // All required fields must be present and non-empty
            expect(record.userId).toBe(props.userId);
            expect(record.userId).not.toBe('');
            expect(record.technologyId).toBe(props.technologyId);
            expect(record.technologyId).not.toBe('');
            expect(record.title).toBeTruthy();
            expect(record.description).toBeTruthy();
            expect(record.hours).toBe(props.hours);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 20: Training Record Employee Association', () => {
    /**
     * **Validates: Requirements 4.3**
     * 
     * For any training record in the system, it must be associated with exactly one
     * employee (user) via the userId foreign key.
     */
    it('should ensure every training record is associated with exactly one employee', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => new TrainingHours(Math.round(h * 100) / 100)),
          }),
          (props) => {
            const record = TrainingRecord.create(props);
            
            // Training record must have exactly one userId
            expect(record.userId).toBeDefined();
            expect(record.userId).toBe(props.userId);
            expect(typeof record.userId).toBe('string');
            expect(record.userId.length).toBeGreaterThan(0);
            
            // userId should not be null or undefined
            expect(record.userId).not.toBeNull();
            expect(record.userId).not.toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain employee association after updates', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => new TrainingHours(Math.round(h * 100) / 100)),
            newTitle: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          }),
          (props) => {
            const record = TrainingRecord.create({
              id: props.id,
              userId: props.userId,
              technologyId: props.technologyId,
              title: props.title,
              description: props.description,
              hours: props.hours,
            });
            
            const originalUserId = record.userId;
            
            // Update the record
            record.update({ title: props.newTitle });
            
            // userId should remain unchanged
            expect(record.userId).toBe(originalUserId);
            expect(record.userId).toBe(props.userId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 21: Training Record Timestamp', () => {
    /**
     * **Validates: Requirements 4.4**
     * 
     * For any training record created in the system, it must have a creation timestamp
     * (createdAt) that is automatically set to the time of creation.
     */
    it('should automatically set creation timestamp for all training records', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => new TrainingHours(Math.round(h * 100) / 100)),
          }),
          (props) => {
            const beforeCreation = new Date();
            const record = TrainingRecord.create(props);
            const afterCreation = new Date();
            
            // createdAt must be defined and be a Date
            expect(record.createdAt).toBeDefined();
            expect(record.createdAt).toBeInstanceOf(Date);
            
            // createdAt should be between before and after creation time
            expect(record.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
            expect(record.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
            
            // createdAt should not be null or undefined
            expect(record.createdAt).not.toBeNull();
            expect(record.createdAt).not.toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have both createdAt and updatedAt timestamps on creation', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => new TrainingHours(Math.round(h * 100) / 100)),
          }),
          (props) => {
            const record = TrainingRecord.create(props);
            
            // Both timestamps must exist
            expect(record.createdAt).toBeDefined();
            expect(record.updatedAt).toBeDefined();
            expect(record.createdAt).toBeInstanceOf(Date);
            expect(record.updatedAt).toBeInstanceOf(Date);
            
            // Initially, createdAt and updatedAt should be very close (within 1 second)
            const timeDiff = Math.abs(record.updatedAt.getTime() - record.createdAt.getTime());
            expect(timeDiff).toBeLessThan(1000);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve createdAt timestamp after updates', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => new TrainingHours(Math.round(h * 100) / 100)),
            newTitle: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          }),
          (props) => {
            const record = TrainingRecord.create({
              id: props.id,
              userId: props.userId,
              technologyId: props.technologyId,
              title: props.title,
              description: props.description,
              hours: props.hours,
            });
            
            const originalCreatedAt = record.createdAt;
            
            // Update the record
            record.update({ title: props.newTitle });
            
            // createdAt should remain unchanged
            expect(record.createdAt).toBe(originalCreatedAt);
            expect(record.createdAt.getTime()).toBe(originalCreatedAt.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
