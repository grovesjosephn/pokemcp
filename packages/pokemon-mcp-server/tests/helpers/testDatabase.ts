import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Test Database Helper
 * Creates a test database with the exact same schema as production.
 * This ensures tests use consistent schema and catch real-world issues.
 */
export class TestDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(testName: string = 'test') {
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
   * Insert standard test data that all tests can rely on
   */
  insertTestData(): void {
    // Insert test Pokemon
    const pokemon = [
      {
        id: 1,
        name: 'bulbasaur',
        height: 7,
        weight: 69,
        base_experience: 64,
        generation: 1,
        species_url: 'https://pokeapi.co/api/v2/pokemon-species/1/',
        sprite_url:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
      },
      {
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        base_experience: 112,
        generation: 1,
        species_url: 'https://pokeapi.co/api/v2/pokemon-species/25/',
        sprite_url:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
      },
      {
        id: 150,
        name: 'mewtwo',
        height: 20,
        weight: 1220,
        base_experience: 340,
        generation: 1,
        species_url: 'https://pokeapi.co/api/v2/pokemon-species/150/',
        sprite_url:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/150.png',
      },
    ];

    const insertPokemon = this.db.prepare(
      'INSERT INTO pokemon (id, name, height, weight, base_experience, generation, species_url, sprite_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    pokemon.forEach((p) =>
      insertPokemon.run(
        p.id,
        p.name,
        p.height,
        p.weight,
        p.base_experience,
        p.generation,
        p.species_url,
        p.sprite_url
      )
    );

    // Insert comprehensive test stats
    const stats = [
      // Bulbasaur stats
      { pokemon_id: 1, stat_name: 'hp', base_stat: 45, effort: 0 },
      { pokemon_id: 1, stat_name: 'attack', base_stat: 49, effort: 0 },
      { pokemon_id: 1, stat_name: 'defense', base_stat: 49, effort: 0 },
      { pokemon_id: 1, stat_name: 'special-attack', base_stat: 65, effort: 1 },
      { pokemon_id: 1, stat_name: 'special-defense', base_stat: 65, effort: 0 },
      { pokemon_id: 1, stat_name: 'speed', base_stat: 45, effort: 0 },
      // Pikachu stats
      { pokemon_id: 25, stat_name: 'hp', base_stat: 35, effort: 0 },
      { pokemon_id: 25, stat_name: 'attack', base_stat: 55, effort: 0 },
      { pokemon_id: 25, stat_name: 'defense', base_stat: 40, effort: 0 },
      { pokemon_id: 25, stat_name: 'special-attack', base_stat: 50, effort: 0 },
      {
        pokemon_id: 25,
        stat_name: 'special-defense',
        base_stat: 50,
        effort: 0,
      },
      { pokemon_id: 25, stat_name: 'speed', base_stat: 90, effort: 2 },
      // Mewtwo stats
      { pokemon_id: 150, stat_name: 'hp', base_stat: 106, effort: 0 },
      { pokemon_id: 150, stat_name: 'attack', base_stat: 110, effort: 0 },
      { pokemon_id: 150, stat_name: 'defense', base_stat: 90, effort: 0 },
      {
        pokemon_id: 150,
        stat_name: 'special-attack',
        base_stat: 154,
        effort: 3,
      },
      {
        pokemon_id: 150,
        stat_name: 'special-defense',
        base_stat: 90,
        effort: 0,
      },
      { pokemon_id: 150, stat_name: 'speed', base_stat: 130, effort: 0 },
    ];

    const insertStat = this.db.prepare(
      'INSERT INTO stats (pokemon_id, stat_name, base_stat, effort) VALUES (?, ?, ?, ?)'
    );
    stats.forEach((s) =>
      insertStat.run(s.pokemon_id, s.stat_name, s.base_stat, s.effort)
    );

    // Insert types
    const types = [
      { id: 1, name: 'grass' },
      { id: 2, name: 'poison' },
      { id: 3, name: 'electric' },
      { id: 4, name: 'psychic' },
    ];

    const insertType = this.db.prepare(
      'INSERT INTO types (id, name) VALUES (?, ?)'
    );
    types.forEach((t) => insertType.run(t.id, t.name));

    // Insert pokemon-type relationships
    const pokemonTypes = [
      { pokemon_id: 1, type_id: 1, slot: 1 }, // bulbasaur - grass
      { pokemon_id: 1, type_id: 2, slot: 2 }, // bulbasaur - poison
      { pokemon_id: 25, type_id: 3, slot: 1 }, // pikachu - electric
      { pokemon_id: 150, type_id: 4, slot: 1 }, // mewtwo - psychic
    ];

    const insertPokemonType = this.db.prepare(
      'INSERT INTO pokemon_types (pokemon_id, type_id, slot) VALUES (?, ?, ?)'
    );
    pokemonTypes.forEach((pt) =>
      insertPokemonType.run(pt.pokemon_id, pt.type_id, pt.slot)
    );

    // Insert abilities
    const abilities = [
      { id: 1, name: 'overgrow' },
      { id: 2, name: 'static' },
      { id: 3, name: 'pressure' },
      { id: 4, name: 'chlorophyll' }, // Bulbasaur hidden ability
      { id: 5, name: 'lightning-rod' }, // Pikachu hidden ability
    ];

    const insertAbility = this.db.prepare(
      'INSERT INTO abilities (id, name) VALUES (?, ?)'
    );
    abilities.forEach((a) => insertAbility.run(a.id, a.name));

    // Insert pokemon-ability relationships
    const pokemonAbilities = [
      { pokemon_id: 1, ability_id: 1, is_hidden: false, slot: 1 }, // bulbasaur - overgrow
      { pokemon_id: 1, ability_id: 4, is_hidden: true, slot: 3 }, // bulbasaur - chlorophyll (hidden)
      { pokemon_id: 25, ability_id: 2, is_hidden: false, slot: 1 }, // pikachu - static
      { pokemon_id: 25, ability_id: 5, is_hidden: true, slot: 2 }, // pikachu - lightning-rod (hidden)
      { pokemon_id: 150, ability_id: 3, is_hidden: false, slot: 1 }, // mewtwo - pressure
    ];

    const insertPokemonAbility = this.db.prepare(
      'INSERT INTO pokemon_abilities (pokemon_id, ability_id, is_hidden, slot) VALUES (?, ?, ?, ?)'
    );
    pokemonAbilities.forEach((pa) =>
      insertPokemonAbility.run(
        pa.pokemon_id,
        pa.ability_id,
        pa.is_hidden ? 1 : 0,
        pa.slot
      )
    );
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
