import { Technology } from '../Technology';

describe('Technology Entity', () => {
  describe('create', () => {
    it('should create a technology with all required fields', () => {
      const tech = Technology.create({
        id: '123',
        name: 'JavaScript',
        category: 'Programming',
      });

      expect(tech.id).toBe('123');
      expect(tech.name).toBe('JavaScript');
      expect(tech.category).toBe('Programming');
      expect(tech.createdAt).toBeInstanceOf(Date);
    });

    it('should trim whitespace from name and category', () => {
      const tech = Technology.create({
        id: '456',
        name: '  TypeScript  ',
        category: '  Frontend  ',
      });

      expect(tech.name).toBe('TypeScript');
      expect(tech.category).toBe('Frontend');
    });

    it('should create a technology with custom timestamp', () => {
      const createdAt = new Date('2024-01-01');
      const tech = Technology.create({
        id: '789',
        name: 'React',
        category: 'Framework',
        createdAt,
      });

      expect(tech.createdAt).toBe(createdAt);
    });

    it('should throw error when name is empty', () => {
      expect(() => {
        Technology.create({
          id: '123',
          name: '',
          category: 'Programming',
        });
      }).toThrow('Technology name is required');
    });

    it('should throw error when name is only whitespace', () => {
      expect(() => {
        Technology.create({
          id: '123',
          name: '   ',
          category: 'Programming',
        });
      }).toThrow('Technology name is required');
    });

    it('should throw error when category is empty', () => {
      expect(() => {
        Technology.create({
          id: '123',
          name: 'JavaScript',
          category: '',
        });
      }).toThrow('Technology category is required');
    });

    it('should throw error when category is only whitespace', () => {
      expect(() => {
        Technology.create({
          id: '123',
          name: 'JavaScript',
          category: '   ',
        });
      }).toThrow('Technology category is required');
    });
  });

  describe('toJSON', () => {
    it('should serialize technology to JSON', () => {
      const tech = Technology.create({
        id: '123',
        name: 'JavaScript',
        category: 'Programming',
      });

      const json = tech.toJSON();

      expect(json).toEqual({
        id: '123',
        name: 'JavaScript',
        category: 'Programming',
        createdAt: expect.any(String),
      });
    });
  });
});
