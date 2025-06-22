import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Test Database Helper for Ingestion Package
 * Creates a test database with the exact same schema as production.
 * This ensures tests use consistent schema and catch real-world issues.
 */
export class TestDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(testName: string = 'ingestion-test') {
    // Create unique test database for each test suite with timestamp to avoid conflicts
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    this.dbPath = path.join(
      process.cwd(),
      `${testName}-${timestamp}-${randomId}.sqlite`
    );
    this.db = new Database(this.dbPath);
    this.setupProductionSchema();
  }

  /**
   * Creates the exact same schema as production database
   * This is extracted from packages/pokemon-mcp-ingestion/src/database.ts
   */
  private setupProductionSchema(): void {
    // Enable foreign keys (important for data integrity in tests)
    this.db.pragma('foreign_keys = ON');

    // Create tables exactly as they exist in production
    this.db.exec(`
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

      CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pokemon_id INTEGER,
        stat_name TEXT,
        base_stat INTEGER,
        effort INTEGER,
        FOREIGN KEY (pokemon_id) REFERENCES pokemon (id)
      );

      CREATE TABLE IF NOT EXISTS types (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pokemon_types (
        pokemon_id INTEGER,
        type_id INTEGER,
        slot INTEGER,
        PRIMARY KEY (pokemon_id, type_id),
        FOREIGN KEY (pokemon_id) REFERENCES pokemon (id),
        FOREIGN KEY (type_id) REFERENCES types (id)
      );

      CREATE TABLE IF NOT EXISTS abilities (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        is_hidden BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS pokemon_abilities (
        pokemon_id INTEGER,
        ability_id INTEGER,
        is_hidden BOOLEAN DEFAULT FALSE,
        slot INTEGER,
        PRIMARY KEY (pokemon_id, ability_id),
        FOREIGN KEY (pokemon_id) REFERENCES pokemon (id),
        FOREIGN KEY (ability_id) REFERENCES abilities (id)
      );

      CREATE TABLE IF NOT EXISTS moves (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        power INTEGER,
        accuracy INTEGER,
        pp INTEGER,
        type_id INTEGER,
        damage_class TEXT,
        FOREIGN KEY (type_id) REFERENCES types (id)
      );

      CREATE TABLE IF NOT EXISTS pokemon_moves (
        pokemon_id INTEGER,
        move_id INTEGER,
        learn_method TEXT,
        level_learned INTEGER,
        PRIMARY KEY (pokemon_id, move_id, learn_method),
        FOREIGN KEY (pokemon_id) REFERENCES pokemon (id),
        FOREIGN KEY (move_id) REFERENCES moves (id)
      );

      -- Performance indexes (same as production)
      CREATE INDEX IF NOT EXISTS idx_pokemon_name ON pokemon (name);
      CREATE INDEX IF NOT EXISTS idx_pokemon_generation ON pokemon (generation);
      CREATE INDEX IF NOT EXISTS idx_stats_pokemon ON stats (pokemon_id);
      CREATE INDEX IF NOT EXISTS idx_pokemon_types_pokemon ON pokemon_types (pokemon_id);
    `);
  }

  /**
   * Insert minimal test data for ingestion tests
   */
  insertTestData(): void {
    // Insert basic types that might be referenced during ingestion
    const types = [
      { id: 1, name: 'grass' },
      { id: 2, name: 'poison' },
      { id: 3, name: 'electric' },
      { id: 4, name: 'psychic' },
    ];

    const insertType = this.db.prepare(
      'INSERT OR IGNORE INTO types (id, name) VALUES (?, ?)'
    );
    types.forEach((t) => insertType.run(t.id, t.name));

    // Insert basic abilities that might be referenced during ingestion
    const abilities = [
      { id: 1, name: 'overgrow' },
      { id: 2, name: 'static' },
      { id: 3, name: 'pressure' },
      { id: 4, name: 'chlorophyll' },
      { id: 5, name: 'lightning-rod' },
    ];

    const insertAbility = this.db.prepare(
      'INSERT OR IGNORE INTO abilities (id, name) VALUES (?, ?)'
    );
    abilities.forEach((a) => insertAbility.run(a.id, a.name));
  }

  /**
   * Get the database instance for direct queries in tests
   */
  getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * Clean up - close database and delete file
   */
  async cleanup(): Promise<void> {
    this.db.close();
    try {
      await fs.unlink(this.dbPath);
    } catch {
      // File might not exist, that's okay
    }
  }

  /**
   * Clear all data from tables (useful for test isolation)
   */
  clearData(): void {
    // Disable foreign keys temporarily for cascading deletes
    this.db.pragma('foreign_keys = OFF');

    // Clear tables in dependency order
    this.db.exec(`
      DELETE FROM pokemon_moves;
      DELETE FROM moves;
      DELETE FROM pokemon_abilities;
      DELETE FROM abilities;
      DELETE FROM pokemon_types;
      DELETE FROM types;
      DELETE FROM stats;
      DELETE FROM pokemon;
    `);

    // Re-enable foreign keys
    this.db.pragma('foreign_keys = ON');
  }
}

/**
 * Convenience function for creating test databases
 */
export function createTestDatabase(testName?: string): TestDatabase {
  return new TestDatabase(testName);
}
