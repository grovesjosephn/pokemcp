import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { GetTypeEffectivenessTool } from '../../src/tools/getTypeEffectiveness.js';

describe('GetTypeEffectivenessTool', () => {
  let db: Database.Database;
  let tool: GetTypeEffectivenessTool;

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
    `);

    // Insert test data
    db.exec(`
      INSERT INTO pokemon (id, name, height, weight, base_experience, generation, species_url, sprite_url)
      VALUES 
        (1, 'bulbasaur', 7, 69, 64, 1, 'https://pokeapi.co/api/v2/pokemon-species/1/', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'),
        (4, 'charmander', 6, 85, 62, 1, 'https://pokeapi.co/api/v2/pokemon-species/4/', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png'),
        (7, 'squirtle', 5, 90, 63, 1, 'https://pokeapi.co/api/v2/pokemon-species/7/', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png');

      INSERT INTO types (id, name) VALUES 
        (1, 'grass'),
        (2, 'poison'),
        (3, 'fire'),
        (4, 'water');

      INSERT INTO pokemon_types (pokemon_id, type_id, slot) VALUES 
        (1, 1, 1), (1, 2, 2),
        (4, 3, 1),
        (7, 4, 1);
    `);

    tool = new GetTypeEffectivenessTool(db);
  });

  it('should return type analysis for existing type', async () => {
    const result = await tool.execute('fire');
    expect(result.content[0].text).toContain('# Fire Type Analysis');
  });

  it('should handle case-insensitive type names', async () => {
    const result = await tool.execute('FIRE');
    expect(result.content[0].text).toContain('# Fire Type Analysis');
  });

  it('should return error message for non-existent type', async () => {
    const result = await tool.execute('dragon');
    expect(result.content[0].text).toBe('Type "dragon" not found.');
  });

  it('should include Pokemon list when includePokemon is true', async () => {
    const result = await tool.execute('fire', true);
    expect(result.content[0].text).toContain('## Pokemon with fire type');
    expect(result.content[0].text).toContain('**Charmander** (#4)');
  });

  it('should not include Pokemon list when includePokemon is false', async () => {
    const result = await tool.execute('fire', false);
    expect(result.content[0].text).not.toContain('## Pokemon with fire type');
  });

  it('should limit Pokemon list to 20 entries', async () => {
    // Insert 25 Pokemon of the same type
    const insertPokemon = db.prepare(`
      INSERT INTO pokemon (id, name, height, weight, base_experience, generation, species_url, sprite_url)
      VALUES (?, ?, 7, 69, 64, 1, 'https://pokeapi.co/api/v2/pokemon-species/?/', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/?.png')
    `);

    const insertType = db.prepare(`
      INSERT INTO pokemon_types (pokemon_id, type_id, slot)
      VALUES (?, 1, 1)
    `);

    for (let i = 20; i < 45; i++) {
      insertPokemon.run(i, `pokemon${i}`);
      insertType.run(i);
    }

    const result = await tool.execute('grass', true);
    const pokemonLines = result.content[0].text
      .split('\n')
      .filter((line) => line.startsWith('- **'));
    expect(pokemonLines.length).toBeLessThanOrEqual(20);
  });
});
