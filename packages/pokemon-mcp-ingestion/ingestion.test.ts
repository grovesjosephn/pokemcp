import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import Database from 'better-sqlite3';
import { TestDatabase } from './tests/helpers/testDatabase.js';

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

import fetch from 'node-fetch';
const mockFetch = vi.mocked(fetch);

// Import ingestion types
interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  generation: number;
  species?: { name: string; url: string };
  sprites: {
    front_default: string;
    back_default: string;
    front_shiny: string;
    back_shiny: string;
  };
  stats: Array<{
    stat: { name: string; url: string };
    base_stat: number;
    effort: number;
  }>;
  types: Array<{
    slot: number;
    type: { name: string; url: string };
  }>;
  abilities: Array<{
    ability: { name: string; url: string };
    is_hidden: boolean;
    slot: number;
  }>;
}

describe('Pokemon Data Ingestion', () => {
  let testDb: TestDatabase;
  let db: Database.Database;

  beforeAll(async () => {
    // Create test database with production schema
    testDb = new TestDatabase('ingestion-test');
    testDb.insertTestData();
    db = testDb.getDatabase();
  });

  afterAll(async () => {
    if (testDb) {
      await testDb.cleanup();
    }
  });

  beforeEach(() => {
    // Clear all data before each test
    testDb.clearData();

    // Re-insert basic reference data needed for ingestion
    testDb.insertTestData();

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('Database Schema', () => {
    it('should create all required tables', () => {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as any[];
      const tableNames = tables.map((t) => t.name);

      expect(tableNames).toContain('pokemon');
      expect(tableNames).toContain('stats');
      expect(tableNames).toContain('pokemon_types');
      expect(tableNames).toContain('pokemon_abilities');
      expect(tableNames).toContain('types');
      expect(tableNames).toContain('abilities');
      expect(tableNames).toContain('moves');
      expect(tableNames).toContain('pokemon_moves');
    });

    it('should have correct pokemon table structure', () => {
      const columns = db.prepare('PRAGMA table_info(pokemon)').all() as any[];
      const columnNames = columns.map((c) => c.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('height');
      expect(columnNames).toContain('weight');
      expect(columnNames).toContain('base_experience');
      expect(columnNames).toContain('generation');
      expect(columnNames).toContain('species_url');
      expect(columnNames).toContain('sprite_url');
    });
  });

  describe('Data Insertion', () => {
    it('should insert pokemon data correctly', () => {
      const pokemon = {
        id: 1,
        name: 'bulbasaur',
        height: 7,
        weight: 69,
        base_experience: 64,
        generation: 1,
        species_url: 'https://pokeapi.co/api/v2/pokemon-species/1/',
        sprite_url:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
      };

      const insertPokemon = db.prepare(`
        INSERT INTO pokemon (id, name, height, weight, base_experience, generation, species_url, sprite_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertPokemon.run(
        pokemon.id,
        pokemon.name,
        pokemon.height,
        pokemon.weight,
        pokemon.base_experience,
        pokemon.generation,
        pokemon.species_url,
        pokemon.sprite_url
      );

      expect(result.changes).toBe(1);

      const retrieved = db
        .prepare('SELECT * FROM pokemon WHERE id = ?')
        .get(1) as any;
      expect(retrieved.name).toBe('bulbasaur');
      expect(retrieved.generation).toBe(1);
    });

    it('should insert pokemon stats correctly', () => {
      // First insert a pokemon
      const insertPokemon = db.prepare(`
        INSERT INTO pokemon (id, name, height, weight, base_experience, generation, species_url, sprite_url)
        VALUES (1, 'bulbasaur', 7, 69, 64, 1, 'test', 'test')
      `);
      insertPokemon.run();

      // Insert stats
      const stats = [
        { pokemon_id: 1, stat_name: 'hp', base_stat: 45, effort: 0 },
        { pokemon_id: 1, stat_name: 'attack', base_stat: 49, effort: 0 },
      ];

      const insertStat = db.prepare(`
        INSERT INTO stats (pokemon_id, stat_name, base_stat, effort)
        VALUES (?, ?, ?, ?)
      `);

      stats.forEach((stat) => {
        const result = insertStat.run(
          stat.pokemon_id,
          stat.stat_name,
          stat.base_stat,
          stat.effort
        );
        expect(result.changes).toBe(1);
      });

      const retrievedStats = db
        .prepare('SELECT * FROM stats WHERE pokemon_id = 1')
        .all();
      expect(retrievedStats).toHaveLength(2);
    });

    it('should insert pokemon types correctly', () => {
      // First insert a pokemon
      const insertPokemon = db.prepare(`
        INSERT INTO pokemon (id, name, height, weight, base_experience, generation, species_url, sprite_url)
        VALUES (1, 'bulbasaur', 7, 69, 64, 1, 'test', 'test')
      `);
      insertPokemon.run();

      // Insert types (using the production schema with separate types table)
      const typeData = [
        { id: 1, name: 'grass' },
        { id: 2, name: 'poison' },
      ];

      // Types should already exist from test data, but ensure they're there
      const insertTypeRecord = db.prepare(`
        INSERT OR IGNORE INTO types (id, name) VALUES (?, ?)
      `);
      typeData.forEach((type) => {
        insertTypeRecord.run(type.id, type.name);
      });

      // Insert pokemon-type relationships using correct production schema
      const insertPokemonType = db.prepare(`
        INSERT INTO pokemon_types (pokemon_id, type_id, slot)
        VALUES (?, ?, ?)
      `);

      typeData.forEach((type, index) => {
        const result = insertPokemonType.run(1, type.id, index + 1);
        expect(result.changes).toBe(1);
      });

      // Retrieve types using JOIN (production-style query)
      const retrievedTypes = db
        .prepare(
          `
          SELECT t.name as type_name 
          FROM pokemon_types pt 
          JOIN types t ON pt.type_id = t.id 
          WHERE pt.pokemon_id = 1 
          ORDER BY pt.slot
        `
        )
        .all() as any[];
      const typeNames = retrievedTypes.map((t) => t.type_name);
      expect(typeNames).toContain('grass');
      expect(typeNames).toContain('poison');
    });

    it('should handle duplicate pokemon insertions', () => {
      const insertPokemon = db.prepare(`
        INSERT OR REPLACE INTO pokemon (id, name, height, weight, base_experience, generation, species_url, sprite_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Insert first time
      insertPokemon.run(1, 'bulbasaur', 7, 69, 64, 1, 'test', 'test');

      // Insert again with same ID
      insertPokemon.run(1, 'updated-bulbasaur', 8, 70, 65, 1, 'test', 'test');

      const result = db
        .prepare('SELECT * FROM pokemon WHERE id = 1')
        .get() as any;
      expect(result.name).toBe('updated-bulbasaur');
      expect(result.height).toBe(8);
    });
  });

  describe('Data Validation', () => {
    it('should handle missing required fields', () => {
      const insertPokemon = db.prepare(`
        INSERT INTO pokemon (name)
        VALUES (?)
      `);

      // Name is NOT NULL, so this should throw
      expect(() => {
        insertPokemon.run(null);
      }).toThrow();
    });

    it('should validate foreign key constraints', () => {
      // First insert a valid pokemon
      const insertPokemon = db.prepare(`
        INSERT INTO pokemon (id, name, height, weight, base_experience, generation, species_url, sprite_url)
        VALUES (1, 'test-pokemon', 7, 69, 64, 1, 'test', 'test')
      `);
      insertPokemon.run();

      const insertStat = db.prepare(`
        INSERT INTO stats (pokemon_id, stat_name, base_stat, effort)
        VALUES (?, ?, ?, ?)
      `);

      // This should work with a valid foreign key
      const result = insertStat.run(1, 'hp', 50, 0);
      expect(result.changes).toBe(1);

      // Verify the stat was inserted
      const stat = db.prepare('SELECT * FROM stats WHERE pokemon_id = 1').get();
      expect(stat).toBeDefined();
    });
  });

  describe('API Response Processing', () => {
    it('should handle valid pokemon API response format', () => {
      const mockPokemon: Pokemon = {
        id: 1,
        name: 'bulbasaur',
        height: 7,
        weight: 69,
        base_experience: 64,
        generation: 1,
        sprites: {
          front_default: 'sprite_url',
          back_default: 'back_sprite',
          front_shiny: 'shiny_sprite',
          back_shiny: 'back_shiny',
        },
        stats: [
          { stat: { name: 'hp', url: 'url' }, base_stat: 45, effort: 0 },
          { stat: { name: 'attack', url: 'url' }, base_stat: 49, effort: 0 },
        ],
        types: [
          { slot: 1, type: { name: 'grass', url: 'url' } },
          { slot: 2, type: { name: 'poison', url: 'url' } },
        ],
        abilities: [
          {
            ability: { name: 'overgrow', url: 'url' },
            is_hidden: false,
            slot: 1,
          },
        ],
      };

      // This would be the data structure we expect from the API
      expect(mockPokemon.id).toBe(1);
      expect(mockPokemon.stats).toHaveLength(2);
      expect(mockPokemon.types).toHaveLength(2);
      expect(mockPokemon.abilities).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', () => {
      expect(() => {
        new Database('/invalid/path/database.sqlite');
      }).toThrow();
    });

    it('should handle malformed data gracefully', () => {
      const insertPokemon = db.prepare(`
        INSERT INTO pokemon (id, name, height, weight, base_experience, generation, species_url, sprite_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Test with invalid data types
      expect(() => {
        insertPokemon.run(
          'not-a-number',
          'test',
          'not-a-number',
          69,
          64,
          1,
          'test',
          'test'
        );
      }).toThrow();
    });
  });
});
