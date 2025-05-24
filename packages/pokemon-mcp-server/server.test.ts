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

    // Create test schema
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

      CREATE TABLE pokemon_stats (
        pokemon_id INTEGER,
        stat_name TEXT,
        base_stat INTEGER,
        effort INTEGER,
        FOREIGN KEY (pokemon_id) REFERENCES pokemon (id)
      );

      CREATE TABLE pokemon_types (
        pokemon_id INTEGER,
        type_name TEXT,
        FOREIGN KEY (pokemon_id) REFERENCES pokemon (id)
      );

      CREATE TABLE pokemon_abilities (
        pokemon_id INTEGER,
        ability_name TEXT,
        is_hidden BOOLEAN,
        FOREIGN KEY (pokemon_id) REFERENCES pokemon (id)
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

    // Insert test stats
    const stats = [
      { pokemon_id: 1, stat_name: 'hp', base_stat: 45, effort: 0 },
      { pokemon_id: 1, stat_name: 'attack', base_stat: 49, effort: 0 },
      { pokemon_id: 25, stat_name: 'hp', base_stat: 35, effort: 0 },
      { pokemon_id: 25, stat_name: 'attack', base_stat: 55, effort: 0 },
      { pokemon_id: 150, stat_name: 'hp', base_stat: 106, effort: 0 },
      { pokemon_id: 150, stat_name: 'attack', base_stat: 110, effort: 0 },
    ];

    const insertStat = db.prepare(
      'INSERT INTO pokemon_stats VALUES (?, ?, ?, ?)'
    );
    stats.forEach((s) =>
      insertStat.run(s.pokemon_id, s.stat_name, s.base_stat, s.effort)
    );

    // Insert test types
    const types = [
      { pokemon_id: 1, type_name: 'grass' },
      { pokemon_id: 1, type_name: 'poison' },
      { pokemon_id: 25, type_name: 'electric' },
      { pokemon_id: 150, type_name: 'psychic' },
    ];

    const insertType = db.prepare('INSERT INTO pokemon_types VALUES (?, ?)');
    types.forEach((t) => insertType.run(t.pokemon_id, t.type_name));

    // Insert test abilities
    const abilities = [
      { pokemon_id: 1, ability_name: 'overgrow', is_hidden: false },
      { pokemon_id: 25, ability_name: 'static', is_hidden: false },
      { pokemon_id: 150, ability_name: 'pressure', is_hidden: false },
    ];

    const insertAbility = db.prepare(
      'INSERT INTO pokemon_abilities VALUES (?, ?, ?)'
    );
    abilities.forEach((a) =>
      insertAbility.run(a.pokemon_id, a.ability_name, a.is_hidden)
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
               json_group_array(json_object('stat_name', s.stat_name, 'base_stat', s.base_stat, 'effort', s.effort)) as stats,
               json_group_array(DISTINCT t.type_name) as types,
               json_group_array(json_object('name', a.ability_name, 'is_hidden', a.is_hidden)) as abilities
        FROM pokemon p
        LEFT JOIN pokemon_stats s ON p.id = s.pokemon_id
        LEFT JOIN pokemon_types t ON p.id = t.pokemon_id  
        LEFT JOIN pokemon_abilities a ON p.id = a.pokemon_id
        WHERE p.id = ?
        GROUP BY p.id
      `;

      const result = db.prepare(query).get(1) as any;

      expect(result).toBeDefined();
      expect(result.name).toBe('bulbasaur');
      expect(result.id).toBe(1);

      const stats = JSON.parse(result.stats);
      expect(stats).toHaveLength(2);
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
        WHERE pt.type_name = ?
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
        JOIN pokemon_stats s ON p.id = s.pokemon_id
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
        JOIN pokemon_stats s ON p.id = s.pokemon_id
        WHERE s.base_stat >= ?
        LIMIT 10
      `;

      const results = db.prepare(query).all(100) as Pokemon[];

      expect(results).toHaveLength(2); // mewtwo appears twice (hp and attack > 100)
      expect(results.every((p) => p.name === 'mewtwo')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent pokemon', () => {
      const query = `
        SELECT p.*, 
               json_group_array(json_object('stat_name', s.stat_name, 'base_stat', s.base_stat, 'effort', s.effort)) as stats,
               json_group_array(DISTINCT t.type_name) as types,
               json_group_array(json_object('name', a.ability_name, 'is_hidden', a.is_hidden)) as abilities
        FROM pokemon p
        LEFT JOIN pokemon_stats s ON p.id = s.pokemon_id
        LEFT JOIN pokemon_types t ON p.id = t.pokemon_id  
        LEFT JOIN pokemon_abilities a ON p.id = a.pokemon_id
        WHERE p.id = ?
        GROUP BY p.id
      `;

      const result = db.prepare(query).get(999);

      expect(result).toBeUndefined();
    });

    it('should handle empty search results', () => {
      const query = `
        SELECT DISTINCT p.* 
        FROM pokemon p
        JOIN pokemon_types pt ON p.id = pt.pokemon_id
        WHERE pt.type_name = ?
        LIMIT 10
      `;

      const results = db.prepare(query).all('nonexistent-type');

      expect(results).toHaveLength(0);
    });
  });
});
