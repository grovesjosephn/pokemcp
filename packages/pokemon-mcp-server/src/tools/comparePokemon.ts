import Database from 'better-sqlite3';
import { Pokemon, Stat, ToolResponse } from '../types/index.js';
import {
  ResponseFormatter,
  PokemonData,
  PokemonComparisonData,
  MarkdownFormatter,
} from '../formatters/index.js';

export class ComparePokemonTool {
  private formatter: ResponseFormatter;

  constructor(
    private db: Database.Database,
    formatter?: ResponseFormatter
  ) {
    this.formatter = formatter || new MarkdownFormatter();
  }

  private getPokemonData(identifier: string): Pokemon | undefined {
    const isNumeric = /^\d+$/.test(identifier);
    const query = isNumeric
      ? 'SELECT * FROM pokemon WHERE id = ?'
      : 'SELECT * FROM pokemon WHERE LOWER(name) = LOWER(?)';

    return this.db.prepare(query).get(identifier) as Pokemon | undefined;
  }

  private getPokemonStatsData(pokemonId: number): Stat[] {
    return this.db
      .prepare(
        `
      SELECT stat_name, base_stat, effort
      FROM stats
      WHERE pokemon_id = ?
      ORDER BY
        CASE stat_name
          WHEN 'hp' THEN 1
          WHEN 'attack' THEN 2
          WHEN 'defense' THEN 3
          WHEN 'special-attack' THEN 4
          WHEN 'special-defense' THEN 5
          WHEN 'speed' THEN 6
        END
    `
      )
      .all(pokemonId) as Stat[];
  }

  private getPokemonTypes(pokemonId: number): string[] {
    const types = this.db
      .prepare(
        `
      SELECT t.name
      FROM pokemon_types pt
      JOIN types t ON pt.type_id = t.id
      WHERE pt.pokemon_id = ?
      ORDER BY pt.slot
    `
      )
      .all(pokemonId) as { name: string }[];

    return types.map((t) => t.name);
  }

  private getPokemonAbilities(
    pokemonId: number
  ): { name: string; is_hidden: boolean }[] {
    const abilities = this.db
      .prepare(
        `
      SELECT a.name, pa.is_hidden
      FROM pokemon_abilities pa
      JOIN abilities a ON pa.ability_id = a.id
      WHERE pa.pokemon_id = ?
      ORDER BY pa.slot
    `
      )
      .all(pokemonId) as { name: string; is_hidden: number }[];

    return abilities.map((a) => ({
      name: a.name,
      is_hidden: Boolean(a.is_hidden),
    }));
  }

  async execute(
    identifier1: string,
    identifier2: string
  ): Promise<ToolResponse> {
    const pokemon1 = this.getPokemonData(identifier1);
    const pokemon2 = this.getPokemonData(identifier2);

    if (!pokemon1) {
      return this.formatter.formatNotFound(identifier1);
    }
    if (!pokemon2) {
      return this.formatter.formatNotFound(identifier2);
    }

    // Get complete data for both Pokemon
    const stats1 = this.getPokemonStatsData(pokemon1.id);
    const stats2 = this.getPokemonStatsData(pokemon2.id);
    const types1 = this.getPokemonTypes(pokemon1.id);
    const types2 = this.getPokemonTypes(pokemon2.id);
    const abilities1 = this.getPokemonAbilities(pokemon1.id);
    const abilities2 = this.getPokemonAbilities(pokemon2.id);

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
