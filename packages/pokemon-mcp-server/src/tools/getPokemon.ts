import Database from 'better-sqlite3';
import { ToolResponse } from '../types/index.js';
import {
  ResponseFormatter,
  PokemonData,
  MarkdownFormatter,
} from '../formatters/index.js';
import { DatabaseService, PokemonDataExtractor } from '../database/index.js';

export class GetPokemonTool {
  private formatter: ResponseFormatter;
  private dbService: DatabaseService;

  constructor(
    private db: Database.Database,
    formatter?: ResponseFormatter
  ) {
    // Default to markdown formatter for backward compatibility
    this.formatter = formatter || new MarkdownFormatter();
    // Initialize database service for centralized queries
    this.dbService = new DatabaseService(db);
  }

  async execute(identifier: string): Promise<ToolResponse> {
    // Use centralized query to get complete Pokemon data
    const rows = this.dbService.pokemon.getPokemonComplete(identifier);

    if (rows.length === 0) {
      return this.formatter.formatNotFound(identifier);
    }

    // Extract data using centralized extractor functions
    const pokemon = PokemonDataExtractor.extractPokemon(rows);
    const stats = PokemonDataExtractor.extractStats(rows);
    const types = PokemonDataExtractor.extractTypes(rows);
    const abilities = PokemonDataExtractor.extractAbilities(rows);

    // Convert to PokemonData format for formatter
    const pokemonData: PokemonData = {
      id: pokemon.id,
      name: pokemon.name,
      height: pokemon.height,
      weight: pokemon.weight,
      base_experience: pokemon.base_experience,
      generation: pokemon.generation,
      species_url: pokemon.species_url,
      sprite_url: pokemon.sprite_url,
      stats: stats.map((stat) => ({
        stat_name: stat.stat_name,
        base_stat: stat.base_stat,
        effort: stat.effort,
      })),
      types: types.map((type, index) => ({
        name: type.name,
        slot: index + 1,
      })),
      abilities: abilities.map((ability, index) => ({
        name: ability.name,
        is_hidden: Boolean(ability.is_hidden),
        slot: index + 1,
      })),
    };

    return this.formatter.formatPokemon(pokemonData);
  }
}
