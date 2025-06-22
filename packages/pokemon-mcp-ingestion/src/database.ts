import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

export interface DatabaseStats {
  pokemon: number;
  types: number;
  abilities: number;
  moves: number;
}

export class PokemonDatabase {
  private db: Database.Database;

  constructor() {
    // Ensure data directory exists
    const dataDir = path.resolve(process.cwd(), '../../data');
    fs.mkdir(dataDir, { recursive: true }).catch(console.error);

    const dbPath = path.join(dataDir, 'pokemon.sqlite');
    this.db = new Database(dbPath);
    this.setupSchema();
  }

  private setupSchema(): void {
    // Create tables for Pokemon data
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

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_pokemon_name ON pokemon (name);
      CREATE INDEX IF NOT EXISTS idx_pokemon_generation ON pokemon (generation);
      CREATE INDEX IF NOT EXISTS idx_stats_pokemon ON stats (pokemon_id);
      CREATE INDEX IF NOT EXISTS idx_pokemon_types_pokemon ON pokemon_types (pokemon_id);
    `);

    console.log('✅ Database schema created');
  }

  // Prepared statements for efficient bulk operations
  getPreparedStatements(): Record<string, Database.Statement> {
    return {
      insertPokemon: this.db.prepare(`
        INSERT OR REPLACE INTO pokemon 
        (id, name, height, weight, base_experience, generation, species_url, sprite_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `),

      insertStat: this.db.prepare(`
        INSERT OR REPLACE INTO stats (pokemon_id, stat_name, base_stat, effort)
        VALUES (?, ?, ?, ?)
      `),

      insertType: this.db.prepare(`
        INSERT OR IGNORE INTO types (id, name) 
        VALUES (?, ?)
      `),

      insertPokemonType: this.db.prepare(`
        INSERT OR REPLACE INTO pokemon_types (pokemon_id, type_id, slot)
        VALUES (?, ?, ?)
      `),

      insertAbility: this.db.prepare(`
        INSERT OR IGNORE INTO abilities (id, name)
        VALUES (?, ?)
      `),

      insertPokemonAbility: this.db.prepare(`
        INSERT OR REPLACE INTO pokemon_abilities (pokemon_id, ability_id, is_hidden, slot)
        VALUES (?, ?, ?, ?)
      `),
    };
  }

  createTransaction(fn: () => void): Database.Transaction {
    return this.db.transaction(fn);
  }

  getStats(): DatabaseStats {
    interface CountResult {
      count: number;
    }

    return {
      pokemon: (
        this.db
          .prepare('SELECT COUNT(*) as count FROM pokemon')
          .get() as CountResult
      ).count,
      types: (
        this.db
          .prepare('SELECT COUNT(*) as count FROM types')
          .get() as CountResult
      ).count,
      abilities: (
        this.db
          .prepare('SELECT COUNT(*) as count FROM abilities')
          .get() as CountResult
      ).count,
      moves: (
        this.db
          .prepare('SELECT COUNT(*) as count FROM moves')
          .get() as CountResult
      ).count,
    };
  }

  printStats(): void {
    const stats = this.getStats();
    console.log('\n📊 Database Statistics:');
    console.log(`Total Pokemon: ${stats.pokemon}`);
    console.log(`Total Types: ${stats.types}`);
    console.log(`Total Abilities: ${stats.abilities}`);
    console.log(`Total Moves: ${stats.moves}`);
  }

  close(): void {
    this.db.close();
  }
}
