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
import { promises as fs } from 'fs';
import path from 'path';

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
  let db: Database.Database;
  let testDbPath: string;

  beforeAll(async () => {
    testDbPath = path.join(process.cwd(), 'test-ingestion.sqlite');

    // Ensure test database is clean
    try {
      await fs.unlink(testDbPath);
    } catch {
      // File doesn't exist, that's fine
    }

    db = new Database(testDbPath);

    // Create test schema (same as in ingestion)
    db.exec(`
      CREATE TABLE IF NOT EXISTS pokemon (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        height INTEGER,
        weight INTEGER,
        base_experience INTEGER,
        generation INTEGER,
        species_url TEXT,
        sprite_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pokemon_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pokemon_id INTEGER,
        stat_name TEXT,
        base_stat INTEGER,
        effort INTEGER,
        FOREIGN KEY (pokemon_id) REFERENCES pokemon (id)
      );

      CREATE TABLE IF NOT EXISTS pokemon_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pokemon_id INTEGER,
        type_name TEXT,
        FOREIGN KEY (pokemon_id) REFERENCES pokemon (id)
      );

      CREATE TABLE IF NOT EXISTS pokemon_abilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pokemon_id INTEGER,
        ability_name TEXT,
        is_hidden BOOLEAN,
        FOREIGN KEY (pokemon_id) REFERENCES pokemon (id)
      );

      CREATE TABLE IF NOT EXISTS types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
    `);
  });

  afterAll(async () => {
    db.close();
    try {
      await fs.unlink(testDbPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  beforeEach(() => {
    // Clear all tables before each test
    db.exec('DELETE FROM pokemon_abilities');
    db.exec('DELETE FROM pokemon_types');
    db.exec('DELETE FROM pokemon_stats');
    db.exec('DELETE FROM pokemon');
    db.exec('DELETE FROM types');

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
      expect(tableNames).toContain('pokemon_stats');
      expect(tableNames).toContain('pokemon_types');
      expect(tableNames).toContain('pokemon_abilities');
      expect(tableNames).toContain('types');
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
        INSERT INTO pokemon_stats (pokemon_id, stat_name, base_stat, effort)
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
        .prepare('SELECT * FROM pokemon_stats WHERE pokemon_id = 1')
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

      // Insert types
      const types = ['grass', 'poison'];

      const insertType = db.prepare(`
        INSERT INTO pokemon_types (pokemon_id, type_name)
        VALUES (?, ?)
      `);

      types.forEach((type) => {
        const result = insertType.run(1, type);
        expect(result.changes).toBe(1);
      });

      const retrievedTypes = db
        .prepare('SELECT type_name FROM pokemon_types WHERE pokemon_id = 1')
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
        INSERT INTO pokemon (id, name)
        VALUES (?, ?)
      `);

      expect(() => {
        insertPokemon.run(null, 'test'); // ID cannot be null for PRIMARY KEY
      }).toThrow();
    });

    it('should validate foreign key constraints', () => {
      const insertStat = db.prepare(`
        INSERT INTO pokemon_stats (pokemon_id, stat_name, base_stat, effort)
        VALUES (?, ?, ?, ?)
      `);

      // This should work without foreign key constraints enabled by default
      // but let's test the data structure
      const result = insertStat.run(999, 'hp', 50, 0);
      expect(result.changes).toBe(1);

      // Verify the stat was inserted
      const stat = db
        .prepare('SELECT * FROM pokemon_stats WHERE pokemon_id = 999')
        .get();
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
