import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchPokemonTool } from '../../src/tools/searchPokemon.js';
import { TestDatabase } from '../helpers/testDatabase.js';

describe('SearchPokemonTool', () => {
  let testDb: TestDatabase;
  let tool: SearchPokemonTool;

  beforeEach(() => {
    // Use centralized test database with complete schema
    testDb = new TestDatabase('searchPokemon');
    testDb.insertTestData();

    // Add additional test Pokemon for search testing
    const db = testDb.getDatabase();
    db.exec(`
      INSERT INTO pokemon (id, name, height, weight, base_experience, generation, species_url, sprite_url)
      VALUES 
        (4, 'charmander', 6, 85, 62, 1, 'https://pokeapi.co/api/v2/pokemon-species/4/', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png'),
        (7, 'squirtle', 5, 90, 63, 1, 'https://pokeapi.co/api/v2/pokemon-species/7/', 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png');

      INSERT INTO types (id, name) VALUES 
        (5, 'fire'),
        (6, 'water');

      INSERT INTO pokemon_types (pokemon_id, type_id, slot) VALUES 
        (4, 5, 1),
        (7, 6, 1);

      INSERT INTO stats (pokemon_id, stat_name, base_stat, effort)
      VALUES 
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

      INSERT INTO abilities (id, name) VALUES 
        (6, 'blaze'),
        (7, 'torrent'),
        (8, 'solar-power'),
        (9, 'rain-dish');

      INSERT INTO pokemon_abilities (pokemon_id, ability_id, is_hidden, slot) VALUES 
        (4, 6, 0, 1),
        (4, 8, 1, 3),
        (7, 7, 0, 1),
        (7, 9, 1, 3);
    `);

    tool = new SearchPokemonTool(testDb.getDatabase());
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  it('should return all Pokemon when no filters are applied', async () => {
    const result = await tool.execute({});
    expect(result.content[0].text).toContain('Bulbasaur');
    expect(result.content[0].text).toContain('Charmander');
    expect(result.content[0].text).toContain('Squirtle');
  });

  it('should filter by type', async () => {
    const result = await tool.execute({ type: 'fire' });
    expect(result.content[0].text).toContain('Charmander');
    expect(result.content[0].text).not.toContain('Bulbasaur');
    expect(result.content[0].text).not.toContain('Squirtle');
  });

  it('should filter by generation', async () => {
    const result = await tool.execute({ generation: 1 });
    expect(result.content[0].text).toContain('Bulbasaur');
    expect(result.content[0].text).toContain('Charmander');
    expect(result.content[0].text).toContain('Squirtle');
  });

  it('should filter by minimum stats', async () => {
    const result = await tool.execute({ min_stat: 300 });
    expect(result.content[0].text).toContain('Bulbasaur');
    expect(result.content[0].text).toContain('Charmander');
    expect(result.content[0].text).toContain('Squirtle');
  });

  it('should respect the limit parameter', async () => {
    const result = await tool.execute({ limit: 2 });
    const lines = result.content[0].text.split('\n');
    const pokemonLines = lines.filter((line) => line.startsWith('**'));
    expect(pokemonLines.length).toBe(2);
  });

  it('should return no results message when no matches found', async () => {
    const result = await tool.execute({ type: 'dragon' });
    expect(result.content[0].text).toBe(
      '❌ **Error:** No Pokemon found matching the criteria.'
    );
  });
});
