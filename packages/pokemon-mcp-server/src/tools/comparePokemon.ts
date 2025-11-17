import Database from 'better-sqlite3';
import { ToolResponse } from '../types/index.js';
import {
  ResponseFormatter,
  PokemonData,
  PokemonComparisonData,
  MarkdownFormatter,
} from '../formatters/index.js';
import { DatabaseService } from '../database/index.js';

export class ComparePokemonTool {
  private formatter: ResponseFormatter;
  private dbService: DatabaseService;

  constructor(
    private db: Database.Database,
    formatter?: ResponseFormatter
  ) {
    this.formatter = formatter || new MarkdownFormatter();
    this.dbService = new DatabaseService(db);
  }

  async execute(
    identifier1: string,
    identifier2: string
  ): Promise<ToolResponse> {
    const pokemon1 = this.dbService.pokemon.getPokemon(identifier1);
    const pokemon2 = this.dbService.pokemon.getPokemon(identifier2);

    if (!pokemon1) {
      return this.formatter.formatNotFound(identifier1);
    }
    if (!pokemon2) {
      return this.formatter.formatNotFound(identifier2);
    }

    // Get complete data for both Pokemon using centralized queries
    const stats1 = this.dbService.stats.getStatsByPokemonId(pokemon1.id);
    const stats2 = this.dbService.stats.getStatsByPokemonId(pokemon2.id);
    const types1 = this.dbService.types.getTypesByPokemonId(pokemon1.id);
    const types2 = this.dbService.types.getTypesByPokemonId(pokemon2.id);
    const abilities1 = this.dbService.abilities.getAbilitiesByPokemonId(
      pokemon1.id
    );
    const abilities2 = this.dbService.abilities.getAbilitiesByPokemonId(
      pokemon2.id
    );

    // Convert to PokemonData format
    const pokemonData1: PokemonData = {
      id: pokemon1.id,
      name: pokemon1.name,
      height: pokemon1.height,
      weight: pokemon1.weight,
      base_experience: pokemon1.base_experience,
      generation: pokemon1.generation,
      species_url: pokemon1.species_url,
      sprite_url: pokemon1.sprite_url,
      stats: stats1.map((stat) => ({
        stat_name: stat.stat_name,
        base_stat: stat.base_stat,
        effort: stat.effort,
      })),
      types: types1.map((type, index) => ({
        name: type,
        slot: index + 1,
      })),
      abilities: abilities1.map((ability, index) => ({
        name: ability.name,
        is_hidden: ability.is_hidden,
        slot: index + 1,
      })),
    };

    const pokemonData2: PokemonData = {
      id: pokemon2.id,
      name: pokemon2.name,
      height: pokemon2.height,
      weight: pokemon2.weight,
      base_experience: pokemon2.base_experience,
      generation: pokemon2.generation,
      species_url: pokemon2.species_url,
      sprite_url: pokemon2.sprite_url,
      stats: stats2.map((stat) => ({
        stat_name: stat.stat_name,
        base_stat: stat.base_stat,
        effort: stat.effort,
      })),
      types: types2.map((type, index) => ({
        name: type,
        slot: index + 1,
      })),
      abilities: abilities2.map((ability, index) => ({
        name: ability.name,
        is_hidden: ability.is_hidden,
        slot: index + 1,
      })),
    };

    const comparisonData: PokemonComparisonData = {
      pokemon1: pokemonData1,
      pokemon2: pokemonData2,
    };

    return this.formatter.formatComparison(comparisonData);
  }
}
