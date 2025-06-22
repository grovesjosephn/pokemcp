import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { StrongestPokemonTool } from '../../src/tools/strongestPokemon.js';

describe('StrongestPokemonTool', () => {
  let db: Database.Database;
  let tool: StrongestPokemonTool;

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
        (4, 'speed', 65, 1),
        (7, 'hp', 44, 0),
        (7, 'attack', 48, 0),
        (7, 'defense', 65, 1),
        (7, 'special-attack', 50, 0),
        (7, 'special-defense', 64, 0),
        (7, 'speed', 43, 0);
    `);

    tool = new StrongestPokemonTool(db);
  });

  it('should find Pokemon with highest total stats', async () => {
    const result = await tool.execute({ criteria: 'total_stats' });
    expect(result.content[0].text).toContain(
      'Strongest Pokemon by total stats'
    );
    expect(result.content[0].text).toContain('bulbasaur');
  });

  it('should find Pokemon with highest attack', async () => {
    const result = await tool.execute({ criteria: 'attack' });
    expect(result.content[0].text).toContain('Strongest Pokemon by attack');
    expect(result.content[0].text).toContain('charmander');
  });

  it('should find Pokemon with highest defense', async () => {
    const result = await tool.execute({ criteria: 'defense' });
    expect(result.content[0].text).toContain('Strongest Pokemon by defense');
    expect(result.content[0].text).toContain('squirtle');
  });

  it('should filter by type', async () => {
    const result = await tool.execute({ criteria: 'attack', type: 'fire' });
    expect(result.content[0].text).toContain('charmander');
    expect(result.content[0].text).not.toContain('bulbasaur');
    expect(result.content[0].text).not.toContain('squirtle');
  });

  it('should filter by generation', async () => {
    const result = await tool.execute({
      criteria: 'total_stats',
      generation: 1,
    });
    expect(result.content[0].text).toContain('bulbasaur');
    expect(result.content[0].text).toContain('charmander');
    expect(result.content[0].text).toContain('squirtle');
  });

  it('should respect the limit parameter', async () => {
    const result = await tool.execute({ criteria: 'total_stats', limit: 2 });
    const lines = result.content[0].text.split('\n');
    const pokemonLines = lines.filter(
      (line) => line.startsWith('1.') || line.startsWith('2.')
    );
    expect(pokemonLines.length).toBe(2);
  });

  it('should throw error for invalid criteria', async () => {
    await expect(tool.execute({ criteria: 'invalid' as any })).rejects.toThrow(
      'Invalid criteria'
    );
  });
});
