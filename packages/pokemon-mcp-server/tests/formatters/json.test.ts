import { describe, it, expect } from 'vitest';
import { JsonFormatter } from '../../src/formatters/json.js';
import {
  PokemonData,
  PokemonComparisonData,
  PokemonSearchResults,
} from '../../src/formatters/base.js';

describe('JsonFormatter', () => {
  const formatter = new JsonFormatter();

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
    it('should format Pokemon data as structured JSON', () => {
      const result = formatter.formatPokemon(samplePokemon);
      const text = result.content[0].text;

      expect(text).toContain('# Bulbasaur Data');
      expect(text).toContain('```json');

      // Parse the JSON from the code block
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      expect(jsonMatch).toBeTruthy();

      const jsonData = JSON.parse(jsonMatch![1]);

      expect(jsonData.id).toBe(1);
      expect(jsonData.name).toBe('Bulbasaur');
      expect(jsonData.basic_info.generation).toBe(1);
      expect(jsonData.basic_info.height_meters).toBe(0.7);
      expect(jsonData.basic_info.weight_kg).toBe(6.9);
      expect(jsonData.types).toEqual(['grass', 'poison']);
      expect(jsonData.stats.total).toBe(318);
      expect(jsonData.stats.average).toBe(53);
      expect(jsonData.abilities).toHaveLength(2);
      expect(jsonData.abilities[0].name).toBe('overgrow');
      expect(jsonData.abilities[1].is_hidden).toBe(true);
    });

    it('should include all stat details', () => {
      const result = formatter.formatPokemon(samplePokemon);
      const text = result.content[0].text;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonData = JSON.parse(jsonMatch![1]);

      expect(jsonData.stats.individual.hp.base_stat).toBe(45);
      expect(jsonData.stats.individual.hp.effort).toBe(0);
      expect(jsonData.stats.individual['special-attack'].base_stat).toBe(65);
      expect(jsonData.stats.individual['special-attack'].effort).toBe(1);
    });

    it('should include URLs', () => {
      const result = formatter.formatPokemon(samplePokemon);
      const text = result.content[0].text;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonData = JSON.parse(jsonMatch![1]);

      expect(jsonData.urls.species).toBe(
        'https://pokeapi.co/api/v2/pokemon-species/1/'
      );
      expect(jsonData.urls.sprite).toBe('https://example.com/bulbasaur.png');
    });
  });

  describe('formatComparison', () => {
    it('should format Pokemon comparison as structured JSON', () => {
      const pikachu: PokemonData = {
        ...samplePokemon,
        id: 25,
        name: 'pikachu',
        height: 4,
        weight: 60,
        stats: [
          { stat_name: 'hp', base_stat: 35, effort: 0 },
          { stat_name: 'attack', base_stat: 55, effort: 0 },
          { stat_name: 'defense', base_stat: 40, effort: 0 },
          { stat_name: 'special-attack', base_stat: 50, effort: 0 },
          { stat_name: 'special-defense', base_stat: 50, effort: 0 },
          { stat_name: 'speed', base_stat: 90, effort: 2 },
        ],
      };

      const comparison: PokemonComparisonData = {
        pokemon1: samplePokemon,
        pokemon2: pikachu,
      };

      const result = formatter.formatComparison(comparison);
      const text = result.content[0].text;

      expect(text).toContain('# Pokemon Comparison Data');

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonData = JSON.parse(jsonMatch![1]);

      expect(jsonData.comparison.pokemon1.name).toBe('Bulbasaur');
      expect(jsonData.comparison.pokemon2.name).toBe('Pikachu');
      expect(jsonData.comparison.stat_differences).toHaveLength(6);
      expect(jsonData.comparison.stat_differences[0].stat_name).toBe('hp');
      expect(jsonData.comparison.stat_differences[0].difference).toBe(10); // 45 - 35
      expect(jsonData.comparison.summary.total_stats_difference).toBe(-2); // 318 - 320
    });
  });

  describe('formatSearchResults', () => {
    it('should format search results as structured JSON', () => {
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

      expect(text).toContain('# Pokemon Search Results');

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonData = JSON.parse(jsonMatch![1]);

      expect(jsonData.search_results.total_found).toBe(1);
      expect(jsonData.search_results.criteria.type).toBe('grass');
      expect(jsonData.search_results.results).toHaveLength(1);
      expect(jsonData.search_results.results[0].name).toBe('Bulbasaur');
      expect(jsonData.search_results.results[0].types).toEqual([
        'grass',
        'poison',
      ]);
    });

    it('should handle empty search results', () => {
      const results: PokemonSearchResults = {
        criteria: { type: 'nonexistent' },
        totalCount: 0,
        results: [],
      };

      const result = formatter.formatSearchResults(results);
      const text = result.content[0].text;

      expect(text).toContain('# Error');

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonData = JSON.parse(jsonMatch![1]);

      expect(jsonData.error.message).toBe(
        'No Pokemon found matching the criteria.'
      );
    });
  });

  describe('formatPokemonStats', () => {
    it('should format detailed stats as structured JSON', () => {
      const result = formatter.formatPokemonStats(samplePokemon);
      const text = result.content[0].text;

      expect(text).toContain('# Bulbasaur Stats Data');

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonData = JSON.parse(jsonMatch![1]);

      expect(jsonData.pokemon_stats.pokemon.name).toBe('Bulbasaur');
      expect(jsonData.pokemon_stats.stats.summary.total).toBe(318);
      expect(jsonData.pokemon_stats.stats.summary.highest.stat).toBe(
        'special-attack'
      );
      expect(jsonData.pokemon_stats.stats.summary.highest.value).toBe(65);
      expect(jsonData.pokemon_stats.stats.individual.hp.percentage_of_max).toBe(
        18
      ); // Math.round(45/255 * 100)
    });
  });

  describe('formatError', () => {
    it('should format error as structured JSON', () => {
      const result = formatter.formatError('Test error message');
      const text = result.content[0].text;

      expect(text).toContain('# Error');

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonData = JSON.parse(jsonMatch![1]);

      expect(jsonData.error.message).toBe('Test error message');
      expect(jsonData.error.timestamp).toMatch(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      ); // ISO timestamp
    });
  });

  describe('formatNotFound', () => {
    it('should format not found as structured JSON', () => {
      const result = formatter.formatNotFound('missingno');
      const text = result.content[0].text;

      expect(text).toContain('# Pokemon Not Found');

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonData = JSON.parse(jsonMatch![1]);

      expect(jsonData.not_found.searched_for).toBe('missingno');
      expect(jsonData.not_found.message).toBe('Pokemon "missingno" not found.');
      expect(jsonData.not_found.timestamp).toMatch(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
    });
  });
});
