import { describe, it, expect } from 'vitest';
import {
  MarkdownFormatter,
  JsonFormatter,
} from '../../src/formatters/index.js';
import { PokemonData } from '../../src/formatters/base.js';

describe('Formatter Demo', () => {
  const samplePokemon: PokemonData = {
    id: 25,
    name: 'pikachu',
    height: 4,
    weight: 60,
    base_experience: 112,
    generation: 1,
    species_url: 'https://pokeapi.co/api/v2/pokemon-species/25/',
    sprite_url: 'https://example.com/pikachu.png',
    stats: [
      { stat_name: 'hp', base_stat: 35, effort: 0 },
      { stat_name: 'attack', base_stat: 55, effort: 0 },
      { stat_name: 'speed', base_stat: 90, effort: 2 },
    ],
    types: [{ name: 'electric', slot: 1 }],
    abilities: [
      { name: 'static', is_hidden: false, slot: 1 },
      { name: 'lightning-rod', is_hidden: true, slot: 2 },
    ],
  };

  it('should demonstrate markdown formatting', () => {
    const markdownFormatter = new MarkdownFormatter();
    const result = markdownFormatter.formatPokemon(samplePokemon);

    console.log('\n=== MARKDOWN FORMAT ===');
    console.log(result.content[0].text);

    expect(result.content[0].text).toContain('# Pikachu (#25)');
    expect(result.content[0].text).toContain('**Types:** electric');
    expect(result.content[0].text).toContain('lightning-rod (Hidden)');
  });

  it('should demonstrate JSON formatting', () => {
    const jsonFormatter = new JsonFormatter();
    const result = jsonFormatter.formatPokemon(samplePokemon);

    console.log('\n=== JSON FORMAT ===');
    console.log(result.content[0].text);

    expect(result.content[0].text).toContain('# Pikachu Data');
    expect(result.content[0].text).toContain('```json');

    // Verify it's valid JSON
    const jsonMatch = result.content[0].text.match(/```json\n([\s\S]*?)\n```/);
    const jsonData = JSON.parse(jsonMatch![1]);
    expect(jsonData.name).toBe('Pikachu');
    expect(jsonData.types).toEqual(['electric']);
  });

  it('should show both formatters produce different but valid outputs', () => {
    const markdownFormatter = new MarkdownFormatter();
    const jsonFormatter = new JsonFormatter();

    const markdownResult = markdownFormatter.formatPokemon(samplePokemon);
    const jsonResult = jsonFormatter.formatPokemon(samplePokemon);

    // Different formats but same Pokemon
    expect(markdownResult.content[0].text).toContain('Pikachu');
    expect(jsonResult.content[0].text).toContain('Pikachu');

    // Different presentation styles
    expect(markdownResult.content[0].text).toContain('**Basic Info:**');
    expect(jsonResult.content[0].text).toContain('"basic_info"');

    // Both contain the same core data
    expect(markdownResult.content[0].text).toContain('Generation: 1');
    expect(jsonResult.content[0].text).toContain('"generation": 1');
  });
});
