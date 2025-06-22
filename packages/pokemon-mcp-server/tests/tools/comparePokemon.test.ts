import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { ComparePokemonTool } from '../../src/tools/comparePokemon.js';

describe('ComparePokemonTool', () => {
  let db: Database.Database;
  let tool: ComparePokemonTool;

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
      VALUES 
        (1, 'bulbasaur', 7, 69, 64, 1, 'https://pokeapi.co/api/v2/pokemon-species/1/', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'),
        (4, 'charmander', 6, 85, 62, 1, 'https://pokeapi.co/api/v2/pokemon-species/4/', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png');

      INSERT INTO stats (pokemon_id, stat_name, base_stat, effort)
      VALUES 
        (1, 'hp', 45, 0),
        (1, 'attack', 49, 0),
        (1, 'defense', 49, 0),
        (1, 'special-attack', 65, 1),
        (1, 'special-defense', 65, 0),
        (1, 'speed', 45, 0),
        (4, 'hp', 39, 0),
        (4, 'attack', 52, 0),
        (4, 'defense', 43, 0),
        (4, 'special-attack', 60, 0),
        (4, 'special-defense', 50, 0),
        (4, 'speed', 65, 1);
    `);

    tool = new ComparePokemonTool(db);
  });

  it('should compare two Pokemon by ID', async () => {
    const result = await tool.execute('1', '4');
    expect(result.content[0].text).toContain('Bulbasaur vs Charmander');
    expect(result.content[0].text).toContain('ID | #1 | #4');
    expect(result.content[0].text).toContain('hp | 45 | 39');
  });

  it('should compare two Pokemon by name', async () => {
    const result = await tool.execute('bulbasaur', 'charmander');
    expect(result.content[0].text).toContain('Bulbasaur vs Charmander');
    expect(result.content[0].text).toContain('ID | #1 | #4');
  });

  it('should handle case-insensitive name search', async () => {
    const result = await tool.execute('BULBASAUR', 'CHARMANDER');
    expect(result.content[0].text).toContain('Bulbasaur vs Charmander');
  });

  it('should return error message when first Pokemon not found', async () => {
    const result = await tool.execute('999', '4');
    expect(result.content[0].text).toBe(
      'One or both Pokemon not found: "999", "4"'
    );
  });

  it('should return error message when second Pokemon not found', async () => {
    const result = await tool.execute('1', '999');
    expect(result.content[0].text).toBe(
      'One or both Pokemon not found: "1", "999"'
    );
  });

  it('should calculate stat differences correctly', async () => {
    const result = await tool.execute('1', '4');
    expect(result.content[0].text).toContain('hp | 45 | 39 | +6');
    expect(result.content[0].text).toContain('attack | 49 | 52 | -3');
  });

  it('should show total stats comparison', async () => {
    const result = await tool.execute('1', '4');
    const totalStats1 = 45 + 49 + 49 + 65 + 65 + 45;
    const totalStats2 = 39 + 52 + 43 + 60 + 50 + 65;
    expect(result.content[0].text).toContain(
      `Total Stats: ${totalStats1} vs ${totalStats2}`
    );
  });
});
