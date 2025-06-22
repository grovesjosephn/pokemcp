import { ToolResponse } from '../types/index.js';

/**
 * Base interface for Pokemon data used by formatters
 */
export interface PokemonData {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  generation: number;
  species_url: string;
  sprite_url: string;
  stats: Array<{
    stat_name: string;
    base_stat: number;
    effort: number;
  }>;
  types: Array<{
    name: string;
    slot: number;
  }>;
  abilities: Array<{
    name: string;
    is_hidden: boolean;
    slot: number;
  }>;
}

/**
 * Interface for Pokemon comparison data
 */
export interface PokemonComparisonData {
  pokemon1: PokemonData;
  pokemon2: PokemonData;
}

/**
 * Interface for Pokemon search results
 */
export interface PokemonSearchResults {
  criteria: any;
  totalCount: number;
  results: Array<{
    id: number;
    name: string;
    generation: number;
    types: string[];
  }>;
}

/**
 * Interface for type effectiveness data
 */
export interface TypeEffectivenessData {
  typeName: string;
  includePokemon: boolean;
  pokemonList: Array<{
    id: number;
    name: string;
    generation: number;
  }>;
}

/**
 * Interface for strongest Pokemon data
 */
export interface StrongestPokemonData {
  criteria: any;
  results: Array<{
    id: number;
    name: string;
    generation: number;
    statValue: number;
  }>;
}

/**
 * Abstract base class for response formatters
 * Separates data presentation from business logic
 */
export abstract class ResponseFormatter {
  /**
   * Format a single Pokemon's data
   */
  abstract formatPokemon(pokemon: PokemonData): ToolResponse;

  /**
   * Format Pokemon comparison data
   */
  abstract formatComparison(comparison: PokemonComparisonData): ToolResponse;

  /**
   * Format Pokemon search results
   */
  abstract formatSearchResults(results: PokemonSearchResults): ToolResponse;

  /**
   * Format type effectiveness information
   */
  abstract formatTypeEffectiveness(data: TypeEffectivenessData): ToolResponse;

  /**
   * Format Pokemon stats breakdown
   */
  abstract formatPokemonStats(pokemon: PokemonData): ToolResponse;

  /**
   * Format strongest Pokemon results
   */
  abstract formatStrongestPokemon(data: StrongestPokemonData): ToolResponse;

  /**
   * Format error message
   */
  abstract formatError(message: string): ToolResponse;

  /**
   * Format not found message
   */
  abstract formatNotFound(identifier: string): ToolResponse;

  /**
   * Helper method to capitalize Pokemon names consistently
   */
  protected capitalizeName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  /**
   * Helper method to format stats total
   */
  protected calculateStatsTotal(stats: PokemonData['stats']): number {
    return stats.reduce((sum, stat) => sum + stat.base_stat, 0);
  }

  /**
   * Helper method to format height in meters
   */
  protected formatHeight(height: number): string {
    return `${height / 10}m`;
  }

  /**
   * Helper method to format weight in kilograms
   */
  protected formatWeight(weight: number): string {
    return `${weight / 10}kg`;
  }
}
