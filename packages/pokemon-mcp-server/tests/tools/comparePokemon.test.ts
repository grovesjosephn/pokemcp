import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { ComparePokemonTool } from '../../src/tools/comparePokemon.js';
import { TestDatabase } from '../helpers/testDatabase.js';

describe('ComparePokemonTool', () => {
  let testDb: TestDatabase;
  let db: Database.Database;
  let tool: ComparePokemonTool;

  beforeAll(async () => {
    // Create test database with production schema and data
    testDb = new TestDatabase('compare-pokemon-test');
    testDb.insertTestData();
    db = testDb.getDatabase();
    tool = new ComparePokemonTool(db);
  });

  afterAll(async () => {
    if (testDb) {
      await testDb.cleanup();
    }
  });

  it('should compare two Pokemon by ID', async () => {
    const result = await tool.execute('1', '25');
    expect(result.content[0].text).toContain('# Pokemon Comparison');
    expect(result.content[0].text).toContain('## Bulbasaur vs Pikachu');
    expect(result.content[0].text).toContain('| ID | #1 | #25 |');
  });

  it('should compare two Pokemon by name', async () => {
    const result = await tool.execute('bulbasaur', 'pikachu');
    expect(result.content[0].text).toContain('# Pokemon Comparison');
    expect(result.content[0].text).toContain('## Bulbasaur vs Pikachu');
  });

  it('should handle case-insensitive name search', async () => {
    const result = await tool.execute('BULBASAUR', 'pikachu');
    expect(result.content[0].text).toContain('## Bulbasaur vs Pikachu');
  });

  it('should return error message when first Pokemon not found', async () => {
    const result = await tool.execute('999', '25');
    expect(result.content[0].text).toBe('Pokemon "999" not found.');
  });

  it('should return error message when second Pokemon not found', async () => {
    const result = await tool.execute('1', '999');
    expect(result.content[0].text).toBe('Pokemon "999" not found.');
  });

  it('should calculate stat differences correctly', async () => {
    const result = await tool.execute('1', '25');
    expect(result.content[0].text).toContain('hp | 45 | 35 | +10');
    expect(result.content[0].text).toContain('speed | 45 | 90 | -45');
  });

  it('should show total stats comparison', async () => {
    const result = await tool.execute('1', '25');
    // Bulbasaur total: 45+49+49+65+65+45 = 318
    // Pikachu total: 35+55+40+50+50+90 = 320
    expect(result.content[0].text).toContain('**Total Stats:** 318 vs 320');
  });
});
