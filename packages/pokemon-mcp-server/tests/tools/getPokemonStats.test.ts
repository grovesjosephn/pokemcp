import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { GetPokemonStatsTool } from '../../src/tools/getPokemonStats.js';

describe('GetPokemonStatsTool', () => {
  let db: Database.Database;
  let tool: GetPokemonStatsTool;

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
    `);

    // Insert test data
    db.exec(`
      INSERT INTO pokemon (id, name, height, weight, base_experience, generation, species_url, sprite_url)
      VALUES (1, 'bulbasaur', 7, 69, 64, 1, 'https://pokeapi.co/api/v2/pokemon-species/1/', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png');

      INSERT INTO stats (pokemon_id, stat_name, base_stat, effort)
      VALUES 
        (1, 'hp', 45, 0),
        (1, 'attack', 49, 0),
        (1, 'defense', 49, 0),
        (1, 'special-attack', 65, 1),
        (1, 'special-defense', 65, 0),
        (1, 'speed', 45, 0);
    `);

    tool = new GetPokemonStatsTool(db);
  });

  it('should return Pokemon stats when found by ID', async () => {
    const result = await tool.execute('1');
    expect(result.content[0].text).toContain('# bulbasaur - Detailed Stats');
    expect(result.content[0].text).toContain('**hp:** 45 (EV: 0)');
    expect(result.content[0].text).toContain('**attack:** 49 (EV: 0)');
    expect(result.content[0].text).toContain('**special-attack:** 65 (EV: 1)');
  });

  it('should return Pokemon stats when found by name', async () => {
    const result = await tool.execute('bulbasaur');
    expect(result.content[0].text).toContain('# bulbasaur - Detailed Stats');
    expect(result.content[0].text).toContain('**hp:** 45 (EV: 0)');
  });

  it('should handle case-insensitive name search', async () => {
    const result = await tool.execute('BULBASAUR');
    expect(result.content[0].text).toContain('# bulbasaur - Detailed Stats');
  });

  it('should return error message for non-existent Pokemon', async () => {
    const result = await tool.execute('999');
    expect(result.content[0].text).toBe('Pokemon "999" not found.');
  });

  it('should calculate total stats correctly', async () => {
    const result = await tool.execute('1');
    const totalStats = 45 + 49 + 49 + 65 + 65 + 45;
    expect(result.content[0].text).toContain(`Total Base Stats: ${totalStats}`);
  });

  it('should calculate stat distribution percentages correctly', async () => {
    const result = await tool.execute('1');
    const totalStats = 45 + 49 + 49 + 65 + 65 + 45;
    const hpPercentage = ((45 / totalStats) * 100).toFixed(1);
    expect(result.content[0].text).toContain(
      `hp: ${hpPercentage}% of total stats`
    );
  });

  it('should order stats in the correct sequence', async () => {
    const result = await tool.execute('1');
    const statsSection = result.content[0].text
      .split('## Base Stats')[1]
      .split('## Stat Distribution')[0];
    const stats = statsSection
      .split('\n')
      .filter((line) => line.startsWith('**'));
    expect(stats[0]).toContain('hp');
    expect(stats[1]).toContain('attack');
    expect(stats[2]).toContain('defense');
    expect(stats[3]).toContain('special-attack');
    expect(stats[4]).toContain('special-defense');
    expect(stats[5]).toContain('speed');
  });
});
