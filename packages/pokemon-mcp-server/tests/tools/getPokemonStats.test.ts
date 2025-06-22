import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { GetPokemonStatsTool } from '../../src/tools/getPokemonStats.js';
import { TestDatabase } from '../helpers/testDatabase.js';

describe('GetPokemonStatsTool', () => {
  let testDb: TestDatabase;
  let db: Database.Database;
  let tool: GetPokemonStatsTool;

  beforeAll(async () => {
    // Create test database with production schema and data
    testDb = new TestDatabase('get-pokemon-stats-test');
    testDb.insertTestData();
    db = testDb.getDatabase();
    tool = new GetPokemonStatsTool(db);
  });

  afterAll(async () => {
    if (testDb) {
      await testDb.cleanup();
    }
  });

  it('should return Pokemon stats when found by ID', async () => {
    const result = await tool.execute('1');
    expect(result.content[0].text).toContain('# Bulbasaur - Detailed Stats');
    expect(result.content[0].text).toContain('**HP:** 45');
    expect(result.content[0].text).toContain('**ATTACK:** 49');
    expect(result.content[0].text).toContain('**SPECIAL-ATTACK:** 65');
    expect(result.content[0].text).toContain('*EV Yield: 1*');
  });

  it('should return Pokemon stats when found by name', async () => {
    const result = await tool.execute('bulbasaur');
    expect(result.content[0].text).toContain('# Bulbasaur - Detailed Stats');
    expect(result.content[0].text).toContain('**HP:** 45');
  });

  it('should handle case-insensitive name search', async () => {
    const result = await tool.execute('BULBASAUR');
    expect(result.content[0].text).toContain('# Bulbasaur - Detailed Stats');
  });

  it('should return error message for non-existent Pokemon', async () => {
    const result = await tool.execute('999');
    expect(result.content[0].text).toBe('Pokemon "999" not found.');
  });

  it('should calculate total stats correctly', async () => {
    const result = await tool.execute('1');
    const totalStats = 45 + 49 + 49 + 65 + 65 + 45; // 318
    expect(result.content[0].text).toContain(
      `- **Total Base Stats:** ${totalStats}`
    );
  });

  it('should show stat summary with highest and lowest stats', async () => {
    const result = await tool.execute('1');
    expect(result.content[0].text).toContain('## Summary');
    expect(result.content[0].text).toContain('- **Average Stat:**');
    expect(result.content[0].text).toContain('- **Highest Stat:**');
    expect(result.content[0].text).toContain('- **Lowest Stat:**');
  });

  it('should order stats in the correct sequence', async () => {
    const result = await tool.execute('1');
    const text = result.content[0].text;
    const hpIndex = text.indexOf('**HP:**');
    const attackIndex = text.indexOf('**ATTACK:**');
    const speedIndex = text.indexOf('**SPEED:**');

    expect(hpIndex).toBeLessThan(attackIndex);
    expect(attackIndex).toBeLessThan(speedIndex);
  });
});
