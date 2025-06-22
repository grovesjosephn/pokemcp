import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import Database from 'better-sqlite3';
import { GetPokemonTool } from '../../src/tools/getPokemon.js';
import { TestDatabase } from '../helpers/testDatabase.js';

describe('GetPokemonTool', () => {
  let testDb: TestDatabase;
  let db: Database.Database;
  let tool: GetPokemonTool;

  beforeAll(async () => {
    // Create test database with production schema and data
    testDb = new TestDatabase('get-pokemon-test');
    testDb.insertTestData();
    db = testDb.getDatabase();
    tool = new GetPokemonTool(db);
  });

  afterAll(async () => {
    if (testDb) {
      await testDb.cleanup();
    }
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
    it('should execute with centralized query architecture', async () => {
      // Create a fresh tool instance to spy on the constructor behavior
      const prepareSpy = vi.spyOn(db, 'prepare');
      const optimizedTool = new GetPokemonTool(db);

      // Should prepare statements for all query modules during DatabaseService initialization
      // Each query module prepares its own statements, resulting in multiple prepare calls
      expect(prepareSpy.mock.calls.length).toBeGreaterThan(1);

      // Verify the tool works correctly with centralized queries
      const result = await optimizedTool.execute('1');
      expect(result.content[0].text).toContain('Bulbasaur');
      expect(result.content[0].text).toContain('**Types:** grass, poison');
      expect(result.content[0].text).toContain(
        '**Abilities:** overgrow, chlorophyll (Hidden)'
      );

      // Should not call prepare again during execution (reuses prepared statements)
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
