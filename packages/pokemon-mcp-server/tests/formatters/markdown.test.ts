import { describe, it, expect } from 'vitest';
import { MarkdownFormatter } from '../../src/formatters/markdown.js';
import {
  PokemonData,
  PokemonComparisonData,
  PokemonSearchResults,
} from '../../src/formatters/base.js';

describe('MarkdownFormatter', () => {
  const formatter = new MarkdownFormatter();

  const samplePokemon: PokemonData = {
    id: 1,
    name: 'bulbasaur',
    height: 7,
    weight: 69,
    base_experience: 64,
    generation: 1,
    species_url: 'https://pokeapi.co/api/v2/pokemon-species/1/',
    sprite_url: 'https://example.com/bulbasaur.png',
    stats: [
      { stat_name: 'hp', base_stat: 45, effort: 0 },
      { stat_name: 'attack', base_stat: 49, effort: 0 },
      { stat_name: 'defense', base_stat: 49, effort: 0 },
      { stat_name: 'special-attack', base_stat: 65, effort: 1 },
      { stat_name: 'special-defense', base_stat: 65, effort: 0 },
      { stat_name: 'speed', base_stat: 45, effort: 0 },
    ],
    types: [
      { name: 'grass', slot: 1 },
      { name: 'poison', slot: 2 },
    ],
    abilities: [
      { name: 'overgrow', is_hidden: false, slot: 1 },
      { name: 'chlorophyll', is_hidden: true, slot: 2 },
    ],
  };

  describe('formatPokemon', () => {
    it('should format Pokemon data as markdown', () => {
      const result = formatter.formatPokemon(samplePokemon);

      expect(result.content[0].type).toBe('text');
      const text = result.content[0].text;

      expect(text).toContain('# Bulbasaur (#1)');
      expect(text).toContain('Generation: 1');
      expect(text).toContain('Height: 0.7m');
      expect(text).toContain('Weight: 6.9kg');
      expect(text).toContain('Base Experience: 64');
      expect(text).toContain('**Types:** grass, poison');
      expect(text).toContain('**Abilities:** overgrow, chlorophyll (Hidden)');
      expect(text).toContain('- hp: 45');
      expect(text).toContain('- **Total: 318**');
    });

    it('should capitalize Pokemon names', () => {
      const result = formatter.formatPokemon(samplePokemon);
      const text = result.content[0].text;

      expect(text).toContain('# Bulbasaur (#1)');
      expect(text).not.toContain('# bulbasaur (#1)');
    });

    it('should handle Pokemon with single type', () => {
      const singleTypePokemon = {
        ...samplePokemon,
        types: [{ name: 'electric', slot: 1 }],
      };

      const result = formatter.formatPokemon(singleTypePokemon);
      const text = result.content[0].text;

      expect(text).toContain('**Types:** electric');
    });

    it('should handle abilities without hidden abilities', () => {
      const noHiddenAbilitiesPokemon = {
        ...samplePokemon,
        abilities: [{ name: 'overgrow', is_hidden: false, slot: 1 }],
      };

      const result = formatter.formatPokemon(noHiddenAbilitiesPokemon);
      const text = result.content[0].text;

      expect(text).toContain('**Abilities:** overgrow');
      expect(text).not.toContain('(Hidden)');
    });
  });

  describe('formatComparison', () => {
    it('should format Pokemon comparison as markdown table', () => {
      const pikachu: PokemonData = {
        ...samplePokemon,
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        generation: 1,
        stats: [
          { stat_name: 'hp', base_stat: 35, effort: 0 },
          { stat_name: 'attack', base_stat: 55, effort: 0 },
          { stat_name: 'defense', base_stat: 40, effort: 0 },
          { stat_name: 'special-attack', base_stat: 50, effort: 0 },
          { stat_name: 'special-defense', base_stat: 50, effort: 0 },
          { stat_name: 'speed', base_stat: 90, effort: 2 },
        ],
        types: [{ name: 'electric', slot: 1 }],
        abilities: [{ name: 'static', is_hidden: false, slot: 1 }],
      };

      const comparison: PokemonComparisonData = {
        pokemon1: samplePokemon,
        pokemon2: pikachu,
      };

      const result = formatter.formatComparison(comparison);
      const text = result.content[0].text;

      expect(text).toContain('# Pokemon Comparison');
      expect(text).toContain('## Bulbasaur vs Pikachu');
      expect(text).toContain('| ID | #1 | #25 |');
      expect(text).toContain('| hp | 45 | 35 | +10 |');
      expect(text).toContain('| speed | 45 | 90 | -45 |');
      expect(text).toContain('**Total Stats:** 318 vs 320');
    });
  });

  describe('formatSearchResults', () => {
    it('should format search results with multiple Pokemon', () => {
      const results: PokemonSearchResults = {
        criteria: { type: 'grass' },
        totalCount: 1,
        results: [
          {
            id: 1,
            name: 'bulbasaur',
            generation: 1,
            types: ['grass', 'poison'],
          },
        ],
      };

      const result = formatter.formatSearchResults(results);
      const text = result.content[0].text;

      expect(text).toContain('# Search Results (1 found)');
      expect(text).toContain('**Bulbasaur** (#1) - Gen 1');
      expect(text).toContain('Types: grass, poison');
    });

    it('should show limit message when results are truncated', () => {
      const results: PokemonSearchResults = {
        criteria: { type: 'grass' },
        totalCount: 1,
        results: [
          {
            id: 1,
            name: 'bulbasaur',
            generation: 1,
            types: ['grass', 'poison'],
          },
        ],
      };

      const result = formatter.formatSearchResults(results);
      const text = result.content[0].text;

      expect(text).toContain('# Search Results (1 found)');
    });

    it('should handle empty search results', () => {
      const results: PokemonSearchResults = {
        criteria: { type: 'nonexistent' },
        totalCount: 0,
        results: [],
      };

      const result = formatter.formatSearchResults(results);
      const text = result.content[0].text;

      expect(text).toContain(
        '❌ **Error:** No Pokemon found matching the criteria.'
      );
    });
  });

  describe('formatPokemonStats', () => {
    it('should format detailed stats with progress bars', () => {
      const result = formatter.formatPokemonStats(samplePokemon);
      const text = result.content[0].text;

      expect(text).toContain('# Bulbasaur - Detailed Stats');
      expect(text).toContain('## Base Stats Breakdown');
      expect(text).toContain('**HP:** 45');
      expect(text).toContain('█'); // Progress bar
      expect(text).toContain('*EV Yield: 0*');
      expect(text).toContain('## Summary');
      expect(text).toContain('- **Total Base Stats:** 318');
      expect(text).toContain('- **Average Stat:** 53');
      expect(text).toContain('- **Highest Stat:**');
      expect(text).toContain('- **Lowest Stat:**');
    });
  });

  describe('formatError', () => {
    it('should format error messages', () => {
      const result = formatter.formatError('Test error message');
      const text = result.content[0].text;

      expect(text).toBe('❌ **Error:** Test error message');
    });
  });

  describe('formatNotFound', () => {
    it('should format not found messages', () => {
      const result = formatter.formatNotFound('missingno');
      const text = result.content[0].text;

      expect(text).toBe('Pokemon "missingno" not found.');
    });
  });
});
