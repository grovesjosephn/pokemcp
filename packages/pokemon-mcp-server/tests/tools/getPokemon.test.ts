import { describe, it, expect, beforeEach } from 'vitest';
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
      VALUES (1, 'bulbasaur', 7, 69, 64, 1, 'https://pokeapi.co/api/v2/pokemon-species/1/', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png');

      INSERT INTO types (id, name) VALUES (1, 'grass'), (2, 'poison');

      INSERT INTO pokemon_types (pokemon_id, type_id, slot) VALUES (1, 1, 1), (1, 2, 2);

      INSERT INTO abilities (id, name) VALUES (1, 'overgrow'), (2, 'chlorophyll');

      INSERT INTO pokemon_abilities (pokemon_id, ability_id, is_hidden, slot)
      VALUES (1, 1, false, 1), (1, 2, true, 2);

      INSERT INTO stats (pokemon_id, stat_name, base_stat, effort)
      VALUES 
        (1, 'hp', 45, 0),
        (1, 'attack', 49, 0),
        (1, 'defense', 49, 0),
        (1, 'special-attack', 65, 1),
        (1, 'special-defense', 65, 0),
        (1, 'speed', 45, 0);
    `);

    tool = new GetPokemonTool(db);
  });

  it('should return Pokemon details when found by ID', async () => {
    const result = await tool.execute('1');
    expect(result.content[0].text).toContain('Bulbasaur');
    expect(result.content[0].text).toContain('Generation: 1');
    expect(result.content[0].text).toContain('Types: grass, poison');
    expect(result.content[0].text).toContain(
      'Abilities: overgrow, chlorophyll (Hidden)'
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
