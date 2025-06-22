import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { GetPokemonTool } from '../../src/tools/getPokemon.js';

describe('GetPokemonTool', () => {
  let db: Database.Database;
  let tool: GetPokemonTool;

  beforeEach(() => {
    // Create an in-memory database for testing
    db = new Database(':memory:');

    // Create necessary tables
    db.exec(`
      CREATE TABLE pokemon (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        height INTEGER NOT NULL,
        weight INTEGER NOT NULL,
        base_experience INTEGER NOT NULL,
        generation INTEGER NOT NULL,
        species_url TEXT NOT NULL,
        sprite_url TEXT NOT NULL
      );

      CREATE TABLE stats (
        pokemon_id INTEGER NOT NULL,
        stat_name TEXT NOT NULL,
        base_stat INTEGER NOT NULL,
        effort INTEGER NOT NULL,
        FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
      );

      CREATE TABLE types (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE pokemon_types (
        pokemon_id INTEGER NOT NULL,
        type_id INTEGER NOT NULL,
        slot INTEGER NOT NULL,
        FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
        FOREIGN KEY (type_id) REFERENCES types(id)
      );

      CREATE TABLE abilities (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE pokemon_abilities (
        pokemon_id INTEGER NOT NULL,
        ability_id INTEGER NOT NULL,
        is_hidden BOOLEAN NOT NULL,
        slot INTEGER NOT NULL,
        FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
        FOREIGN KEY (ability_id) REFERENCES abilities(id)
      );
    `);

    // Insert test data
    db.exec(`
      INSERT INTO pokemon (id, name, height, weight, base_experience, generation, species_url, sprite_url)
      VALUES 
        (1, 'bulbasaur', 7, 69, 64, 1, 'https://pokeapi.co/api/v2/pokemon-species/1/', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'),
        (25, 'pikachu', 4, 60, 112, 1, 'https://pokeapi.co/api/v2/pokemon-species/25/', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png');

      INSERT INTO types (id, name) VALUES (1, 'grass'), (2, 'poison'), (3, 'electric');

      INSERT INTO pokemon_types (pokemon_id, type_id, slot) VALUES 
        (1, 1, 1), (1, 2, 2),
        (25, 3, 1);

      INSERT INTO abilities (id, name) VALUES (1, 'overgrow'), (2, 'chlorophyll'), (3, 'static'), (4, 'lightning-rod');

      INSERT INTO pokemon_abilities (pokemon_id, ability_id, is_hidden, slot)
      VALUES 
        (1, 1, false, 1), (1, 2, true, 2),
        (25, 3, false, 1), (25, 4, true, 2);

      INSERT INTO stats (pokemon_id, stat_name, base_stat, effort)
      VALUES 
        (1, 'hp', 45, 0),
        (1, 'attack', 49, 0),
        (1, 'defense', 49, 0),
        (1, 'special-attack', 65, 1),
        (1, 'special-defense', 65, 0),
        (1, 'speed', 45, 0),
        (25, 'hp', 35, 0),
        (25, 'attack', 55, 0),
        (25, 'defense', 40, 0),
        (25, 'special-attack', 50, 0),
        (25, 'special-defense', 50, 0),
        (25, 'speed', 90, 2);
    `);

    tool = new GetPokemonTool(db);
  });

  describe('Basic functionality', () => {
    it('should return Pokemon details when found by ID', async () => {
      const result = await tool.execute('1');
      expect(result.content[0].text).toContain('Bulbasaur');
      expect(result.content[0].text).toContain('Generation: 1');
      expect(result.content[0].text).toContain('**Types:** grass, poison');
      expect(result.content[0].text).toContain(
        '**Abilities:** overgrow, chlorophyll (Hidden)'
      );
    });

    it('should return Pokemon details when found by name', async () => {
      const result = await tool.execute('bulbasaur');
      expect(result.content[0].text).toContain('Bulbasaur');
      expect(result.content[0].text).toContain('Generation: 1');
    });

    it('should return not found message for non-existent Pokemon', async () => {
      const result = await tool.execute('999');
      expect(result.content[0].text).toBe('Pokemon "999" not found.');
    });

    it('should handle case-insensitive name search', async () => {
      const result = await tool.execute('BULBASAUR');
      expect(result.content[0].text).toContain('Bulbasaur');
    });
  });

  describe('Data completeness', () => {
    it('should include all base stats with correct totals', async () => {
      const result = await tool.execute('1');
      const text = result.content[0].text;

      expect(text).toContain('hp: 45');
      expect(text).toContain('attack: 49');
      expect(text).toContain('defense: 49');
      expect(text).toContain('special-attack: 65');
      expect(text).toContain('special-defense: 65');
      expect(text).toContain('speed: 45');
      expect(text).toContain('Total: 318');
    });

    it('should include physical attributes', async () => {
      const result = await tool.execute('1');
      const text = result.content[0].text;

      expect(text).toContain('Height: 0.7m');
      expect(text).toContain('Weight: 6.9kg');
      expect(text).toContain('Base Experience: 64');
    });

    it('should handle Pokemon with single type', async () => {
      const result = await tool.execute('25');
      expect(result.content[0].text).toContain('**Types:** electric');
    });

    it('should properly format abilities with hidden status', async () => {
      const result = await tool.execute('25');
      expect(result.content[0].text).toContain(
        '**Abilities:** static, lightning-rod (Hidden)'
      );
    });
  });

  describe('Performance and Database optimization', () => {
    it('should execute with optimized single query approach', async () => {
      // Create a fresh tool instance to spy on the constructor behavior
      const prepareSpy = vi.spyOn(db, 'prepare');
      const optimizedTool = new GetPokemonTool(db);

      // Should prepare exactly one statement in constructor (our optimized query)
      expect(prepareSpy).toHaveBeenCalledTimes(1);

      // Verify the tool works correctly with optimization
      const result = await optimizedTool.execute('1');
      expect(result.content[0].text).toContain('Bulbasaur');
      expect(result.content[0].text).toContain('**Types:** grass, poison');
      expect(result.content[0].text).toContain(
        '**Abilities:** overgrow, chlorophyll (Hidden)'
      );

      // Should not call prepare again during execution (reuses prepared statement)
      const prepareCallsBeforeSecondExecution = prepareSpy.mock.calls.length;
      await optimizedTool.execute('25');
      expect(prepareSpy.mock.calls.length).toBe(
        prepareCallsBeforeSecondExecution
      );
    });
  });

  describe('Error handling', () => {
    it('should handle empty string identifier', async () => {
      const result = await tool.execute('');
      expect(result.content[0].text).toBe('Pokemon "" not found.');
    });

    it('should handle special characters in name', async () => {
      const result = await tool.execute('pokemon-with-dashes');
      expect(result.content[0].text).toContain('not found');
    });

    it('should handle numeric strings that are not valid IDs', async () => {
      const result = await tool.execute('99999');
      expect(result.content[0].text).toBe('Pokemon "99999" not found.');
    });
  });

  describe('Response format consistency', () => {
    it('should return consistent response structure', async () => {
      const result = await tool.execute('1');

      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
    });

    it('should format Pokemon name with proper capitalization', async () => {
      const result = await tool.execute('1');
      expect(result.content[0].text).toMatch(/^# Bulbasaur \(#1\)/);
    });
  });
});
