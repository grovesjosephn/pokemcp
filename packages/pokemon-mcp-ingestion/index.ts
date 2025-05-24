// Pokemon Data Ingestion App
// Fetches data from PokeAPI and stores in SQLite for MCP server

import Database from 'better-sqlite3';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';

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

interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    name: string;
    url: string;
  }>;
}

interface TypeResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    name: string;
    url: string;
  }>;
}

interface SpeciesResponse {
  generation: {
    name: string;
    url: string;
  };
}

class PokemonDataIngestion {
  private db: Database.Database;
  private baseUrl: string;
  private batchSize: number;

  constructor() {
    // Ensure data directory exists
    const dataDir = path.resolve(process.cwd(), '../../data');
    fs.mkdir(dataDir, { recursive: true }).catch(console.error);
    
    const dbPath = path.join(dataDir, 'pokemon.sqlite');
    this.db = new Database(dbPath);
    this.baseUrl = 'https://pokeapi.co/api/v2';
    this.batchSize = 20; // Concurrent requests
    this.setupDatabase();
  }

  setupDatabase() {
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

  async fetchWithRetry(url: string, retries = 3): Promise<any> {
    if (!url) {
      throw new Error('URL is required');
    }

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } catch (error) {
        console.log(`⚠️  Retry ${i + 1}/${retries} for ${url}: ${error instanceof Error ? error.message : String(error)}`);
        if (i === retries - 1) throw error;
        await this.delay(1000 * (i + 1)); // Exponential backoff
      }
    }
  }

  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async ingestTypes(): Promise<void> {
    console.log('🔄 Fetching Pokemon types...');
    
    const typesData = await this.fetchWithRetry(`${this.baseUrl}/type`) as TypeResponse;
    const insertType = this.db.prepare('INSERT OR IGNORE INTO types (id, name) VALUES (?, ?)');
    
    for (const type of typesData.results) {
      const typeId = parseInt(type.url.split('/').slice(-2, -1)[0]);
      insertType.run(typeId, type.name);
    }
    
    console.log(`✅ Inserted ${typesData.results.length} types`);
  }

  async ingestPokemonBatch(pokemonList: Array<{ name: string; url: string }>): Promise<number> {
    const insertPokemon = this.db.prepare(`
      INSERT OR REPLACE INTO pokemon 
      (id, name, height, weight, base_experience, generation, species_url, sprite_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertStat = this.db.prepare(`
      INSERT OR REPLACE INTO stats (pokemon_id, stat_name, base_stat, effort)
      VALUES (?, ?, ?, ?)
    `);
    
    const insertPokemonType = this.db.prepare(`
      INSERT OR REPLACE INTO pokemon_types (pokemon_id, type_id, slot)
      VALUES (?, ?, ?)
    `);

    const insertAbility = this.db.prepare(`
      INSERT OR IGNORE INTO abilities (id, name)
      VALUES (?, ?)
    `);

    const insertPokemonAbility = this.db.prepare(`
      INSERT OR REPLACE INTO pokemon_abilities (pokemon_id, ability_id, is_hidden, slot)
      VALUES (?, ?, ?, ?)
    `);

    // Fetch detailed data for each Pokemon in parallel
    const pokemonPromises = pokemonList.map(async (pokemon) => {
      try {
        const pokemonId = parseInt(pokemon.url.split('/').slice(-2, -1)[0]);
        const detailData = await this.fetchWithRetry(`${this.baseUrl}/pokemon/${pokemonId}`) as Pokemon;
        console.log('DEBUG detailData:', detailData);
        // Get generation from species data
        if (!detailData.species || !detailData.species.url) {
          console.error(`❌ No species.url for ${pokemon.name}, detailData:`, detailData);
          return null;
        }
        const speciesData = await this.fetchWithRetry(detailData.species.url) as SpeciesResponse;
        console.log('DEBUG speciesData:', speciesData);
        const generation = parseInt(speciesData.generation.url.split('/').slice(-2, -1)[0]);
        
        return {
          id: pokemonId,
          name: detailData.name,
          height: detailData.height,
          weight: detailData.weight,
          base_experience: detailData.base_experience,
          generation,
          species_url: detailData.species?.url || '',
          sprite_url: detailData.sprites?.front_default || '',
          stats: detailData.stats,
          types: detailData.types,
          abilities: detailData.abilities
        };
      } catch (error) {
        console.error(`❌ Failed to fetch ${pokemon.name}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }
    });

    const results = await Promise.all(pokemonPromises);
    const validResults = results.filter((result): result is NonNullable<typeof result> => result !== null);

    // Insert data in transaction for performance
    const transaction = this.db.transaction(() => {
      for (const pokemon of validResults) {
        // Insert Pokemon
        insertPokemon.run(
          pokemon.id,
          pokemon.name,
          pokemon.height ?? 0,
          pokemon.weight ?? 0,
          pokemon.base_experience ?? 0,
          pokemon.generation ?? 1,
          pokemon.species_url ?? '',
          pokemon.sprite_url ?? ''
        );

        // Insert Stats
        for (const stat of pokemon.stats) {
          insertStat.run(
            pokemon.id,
            stat.stat.name,
            stat.base_stat ?? 0,
            stat.effort ?? 0
          );
        }

        // Insert Types
        for (const type of pokemon.types) {
          const typeId = parseInt(type.type.url.split('/').slice(-2, -1)[0]);
          insertPokemonType.run(pokemon.id, typeId, type.slot ?? 1);
        }

        // Insert Abilities
        for (const ability of pokemon.abilities) {
          const abilityId = parseInt(ability.ability.url.split('/').slice(-2, -1)[0]);
          insertAbility.run(abilityId, ability.ability.name);
          insertPokemonAbility.run(
            pokemon.id,
            abilityId,
            ability.is_hidden ? 1 : 0,
            ability.slot ?? 1
          );
        }
      }
    });

    transaction();
    return validResults.length;
  }

  async ingestAllPokemon(limit: number | null = null): Promise<void> {
    console.log('🔄 Starting Pokemon data ingestion...');
    
    // First, ingest types
    await this.ingestTypes();
    
    // Get Pokemon list
    const pokemonListUrl = limit 
      ? `${this.baseUrl}/pokemon?limit=${limit}`
      : `${this.baseUrl}/pokemon?limit=1500`; // Covers most Pokemon
    
    const pokemonList = await this.fetchWithRetry(pokemonListUrl) as PokemonListResponse;
    
    // Process in batches
    for (let i = 0; i < pokemonList.results.length; i += this.batchSize) {
      const batch = pokemonList.results.slice(i, i + this.batchSize);
      const count = await this.ingestPokemonBatch(batch);
      console.log(`✅ Processed batch ${Math.floor(i / this.batchSize) + 1}: ${count} Pokemon`);
      // Add a small delay between batches to avoid rate limiting
      await this.delay(1000);
    }
    
    console.log('✅ Pokemon data ingestion complete');
  }

  printStats(): void {
    interface Stats {
      count: number;
    }

    const stats = {
      pokemon: (this.db.prepare('SELECT COUNT(*) as count FROM pokemon').get() as Stats).count,
      types: (this.db.prepare('SELECT COUNT(*) as count FROM types').get() as Stats).count,
      abilities: (this.db.prepare('SELECT COUNT(*) as count FROM abilities').get() as Stats).count,
      moves: (this.db.prepare('SELECT COUNT(*) as count FROM moves').get() as Stats).count
    };
    
    console.log('\n📊 Database Statistics:');
    console.log(`Total Pokemon: ${stats.pokemon}`);
    console.log(`Total Types: ${stats.types}`);
    console.log(`Total Abilities: ${stats.abilities}`);
    console.log(`Total Moves: ${stats.moves}`);
  }

  getPokemonByType(typeName: string): Array<{ id: number; name: string }> {
    return this.db.prepare(`
      SELECT p.id, p.name
      FROM pokemon p
      JOIN pokemon_types pt ON p.id = pt.pokemon_id
      JOIN types t ON pt.type_id = t.id
      WHERE LOWER(t.name) = LOWER(?)
      ORDER BY p.id
    `).all(typeName) as Array<{ id: number; name: string }>;
  }

  getPokemonStats(pokemonName: string): Array<{ stat_name: string; base_stat: number }> {
    return this.db.prepare(`
      SELECT s.stat_name, s.base_stat
      FROM stats s
      JOIN pokemon p ON s.pokemon_id = p.id
      WHERE LOWER(p.name) = LOWER(?)
      ORDER BY s.stat_name
    `).all(pokemonName) as Array<{ stat_name: string; base_stat: number }>;
  }

  close(): void {
    this.db.close();
  }
}

async function main(): Promise<void> {
  const ingestion = new PokemonDataIngestion();
  try {
    await ingestion.ingestAllPokemon();
    ingestion.printStats();
  } catch (error) {
    console.error('❌ Error during ingestion:', error instanceof Error ? error.message : String(error));
  } finally {
    ingestion.close();
  }
}

// Use ES modules check instead of CommonJS
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}