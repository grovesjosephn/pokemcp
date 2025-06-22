import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

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
}

interface Stat {
  stat_name: string;
  base_stat: number;
  effort: number;
}

interface Type {
  name: string;
}

interface Ability {
  name: string;
  is_hidden: boolean;
}

describe('Pokemon MCP Server', () => {
  let db: Database.Database;
  let testDbPath: string;

  beforeAll(async () => {
    testDbPath = path.join(process.cwd(), 'test-pokemon.sqlite');

    // Ensure test database is clean
    try {
      await fs.unlink(testDbPath);
    } catch {
      // File doesn't exist, that's fine
    }

    db = new Database(testDbPath);

    // Create test schema matching the actual database structure
    db.exec(`
      CREATE TABLE pokemon (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        height INTEGER,
        weight INTEGER,
        base_experience INTEGER,
        generation INTEGER,
        species_url TEXT,
        sprite_url TEXT
      );

      CREATE TABLE stats (
        pokemon_id INTEGER,
        stat_name TEXT,
        base_stat INTEGER,
        effort INTEGER,
        FOREIGN KEY (pokemon_id) REFERENCES pokemon (id)
      );

      CREATE TABLE types (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE pokemon_types (
        pokemon_id INTEGER,
        type_id INTEGER,
        slot INTEGER,
        FOREIGN KEY (pokemon_id) REFERENCES pokemon (id),
        FOREIGN KEY (type_id) REFERENCES types (id)
      );

      CREATE TABLE abilities (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE pokemon_abilities (
        pokemon_id INTEGER,
        ability_id INTEGER,
        is_hidden INTEGER,
        slot INTEGER,
        FOREIGN KEY (pokemon_id) REFERENCES pokemon (id),
        FOREIGN KEY (ability_id) REFERENCES abilities (id)
      );
    `);

    // Insert test data
    const pokemon = [
      {
        id: 1,
        name: 'bulbasaur',
        height: 7,
        weight: 69,
        base_experience: 64,
        generation: 1,
        species_url: 'test',
        sprite_url: 'test',
      },
      {
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        base_experience: 112,
        generation: 1,
        species_url: 'test',
        sprite_url: 'test',
      },
      {
        id: 150,
        name: 'mewtwo',
        height: 20,
        weight: 1220,
        base_experience: 340,
        generation: 1,
        species_url: 'test',
        sprite_url: 'test',
      },
    ];

    const insertPokemon = db.prepare(
      'INSERT INTO pokemon VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
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

    // Insert test stats - using complete stat sets for realistic testing
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

    const insertStat = db.prepare('INSERT INTO stats VALUES (?, ?, ?, ?)');
    stats.forEach((s) =>
      insertStat.run(s.pokemon_id, s.stat_name, s.base_stat, s.effort)
    );

    // Insert types first
    const typeData = [
      { id: 1, name: 'grass' },
      { id: 2, name: 'poison' },
      { id: 3, name: 'electric' },
      { id: 4, name: 'psychic' },
    ];

    const insertTypeData = db.prepare('INSERT INTO types VALUES (?, ?)');
    typeData.forEach((t) => insertTypeData.run(t.id, t.name));

    // Insert pokemon-type relationships
    const pokemonTypes = [
      { pokemon_id: 1, type_id: 1, slot: 1 }, // bulbasaur - grass
      { pokemon_id: 1, type_id: 2, slot: 2 }, // bulbasaur - poison
      { pokemon_id: 25, type_id: 3, slot: 1 }, // pikachu - electric
      { pokemon_id: 150, type_id: 4, slot: 1 }, // mewtwo - psychic
    ];

    const insertPokemonType = db.prepare(
      'INSERT INTO pokemon_types VALUES (?, ?, ?)'
    );
    pokemonTypes.forEach((pt) =>
      insertPokemonType.run(pt.pokemon_id, pt.type_id, pt.slot)
    );

    // Insert abilities first
    const abilityData = [
      { id: 1, name: 'overgrow' },
      { id: 2, name: 'static' },
      { id: 3, name: 'pressure' },
    ];

    const insertAbilityData = db.prepare('INSERT INTO abilities VALUES (?, ?)');
    abilityData.forEach((a) => insertAbilityData.run(a.id, a.name));

    // Insert pokemon-ability relationships
    const pokemonAbilities = [
      { pokemon_id: 1, ability_id: 1, is_hidden: 0, slot: 1 },
      { pokemon_id: 25, ability_id: 2, is_hidden: 0, slot: 1 },
      { pokemon_id: 150, ability_id: 3, is_hidden: 0, slot: 1 },
    ];

    const insertPokemonAbility = db.prepare(
      'INSERT INTO pokemon_abilities VALUES (?, ?, ?, ?)'
    );
    pokemonAbilities.forEach((pa) =>
      insertPokemonAbility.run(
        pa.pokemon_id,
        pa.ability_id,
        pa.is_hidden,
        pa.slot
      )
    );
  });

  afterAll(async () => {
    db.close();
    try {
      await fs.unlink(testDbPath);
    } catch {
      // Ignore if file doesn't exist
    }
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
