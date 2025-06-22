import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { TestDatabase } from './tests/helpers/testDatabase.js';

// Import the server types and functions
interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  generation: number;
  species_url: string;
  sprite_url: string;
  created_at?: string;
}

interface Stat {
  stat_name: string;
  base_stat: number;
  effort: number;
}

describe('Pokemon MCP Server', () => {
  let testDb: TestDatabase;
  let db: Database.Database;

  beforeAll(async () => {
    // Create test database with production schema
    testDb = new TestDatabase('server-test');
    testDb.insertTestData();
    db = testDb.getDatabase();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe('Database Queries', () => {
    it('should get pokemon by id', () => {
      const query = `
        SELECT p.*, 
               (SELECT json_group_array(json_object('stat_name', stat_name, 'base_stat', base_stat, 'effort', effort)) 
                FROM stats WHERE pokemon_id = p.id) as stats,
               (SELECT json_group_array(DISTINCT t.name) 
                FROM pokemon_types pt JOIN types t ON pt.type_id = t.id WHERE pt.pokemon_id = p.id) as types,
               (SELECT json_group_array(json_object('name', a.name, 'is_hidden', pa.is_hidden)) 
                FROM pokemon_abilities pa JOIN abilities a ON pa.ability_id = a.id WHERE pa.pokemon_id = p.id) as abilities
        FROM pokemon p
        WHERE p.id = ?
      `;

      const result = db.prepare(query).get(1) as any;

      expect(result).toBeDefined();
      expect(result.name).toBe('bulbasaur');
      expect(result.id).toBe(1);

      const stats = JSON.parse(result.stats);
      expect(stats).toHaveLength(6);
      expect(
        stats.some((s: any) => s.stat_name === 'hp' && s.base_stat === 45)
      ).toBe(true);

      const types = JSON.parse(result.types);
      expect(types).toContain('grass');
      expect(types).toContain('poison');
    });

    it('should search pokemon by type', () => {
      const query = `
        SELECT DISTINCT p.* 
        FROM pokemon p
        JOIN pokemon_types pt ON p.id = pt.pokemon_id
        JOIN types t ON pt.type_id = t.id
        WHERE t.name = ?
        LIMIT 10
      `;

      const results = db.prepare(query).all('electric') as Pokemon[];

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('pikachu');
    });

    it('should find strongest pokemon by stat', () => {
      const query = `
        SELECT p.*, s.base_stat
        FROM pokemon p
        JOIN stats s ON p.id = s.pokemon_id
        WHERE s.stat_name = ?
        ORDER BY s.base_stat DESC
        LIMIT ?
      `;

      const results = db.prepare(query).all('attack', 3) as any[];

      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('mewtwo');
      expect(results[0].base_stat).toBe(110);
    });

    it('should search with generation filter', () => {
      const query = `
        SELECT DISTINCT p.* 
        FROM pokemon p
        WHERE p.generation = ?
        LIMIT 10
      `;

      const results = db.prepare(query).all(1) as Pokemon[];

      expect(results).toHaveLength(3);
      expect(results.every((p) => p.generation === 1)).toBe(true);
    });

    it('should search with minimum stat filter', () => {
      const query = `
        SELECT DISTINCT p.* 
        FROM pokemon p
        JOIN stats s ON p.id = s.pokemon_id
        WHERE s.base_stat >= ?
        LIMIT 10
      `;

      const results = db.prepare(query).all(100) as Pokemon[];

      expect(results).toHaveLength(1); // mewtwo (DISTINCT pokemon with stats > 100)
      expect(results.every((p) => p.name === 'mewtwo')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent pokemon', () => {
      const query = `
        SELECT p.*, 
               (SELECT json_group_array(json_object('stat_name', stat_name, 'base_stat', base_stat, 'effort', effort)) 
                FROM stats WHERE pokemon_id = p.id) as stats,
               (SELECT json_group_array(DISTINCT t.name) 
                FROM pokemon_types pt JOIN types t ON pt.type_id = t.id WHERE pt.pokemon_id = p.id) as types,
               (SELECT json_group_array(json_object('name', a.name, 'is_hidden', pa.is_hidden)) 
                FROM pokemon_abilities pa JOIN abilities a ON pa.ability_id = a.id WHERE pa.pokemon_id = p.id) as abilities
        FROM pokemon p
        WHERE p.id = ?
      `;

      const result = db.prepare(query).get(999);

      expect(result).toBeUndefined();
    });

    it('should handle empty search results', () => {
      const query = `
        SELECT DISTINCT p.* 
        FROM pokemon p
        JOIN pokemon_types pt ON p.id = pt.pokemon_id
        JOIN types t ON pt.type_id = t.id
        WHERE t.name = ?
        LIMIT 10
      `;

      const results = db.prepare(query).all('nonexistent-type');

      expect(results).toHaveLength(0);
    });
  });
});
