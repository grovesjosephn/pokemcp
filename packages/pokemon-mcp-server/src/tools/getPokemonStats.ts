import Database from 'better-sqlite3';
import { Pokemon, Stat, ToolResponse } from '../types/index.js';
import {
  ResponseFormatter,
  PokemonData,
  MarkdownFormatter,
} from '../formatters/index.js';

export class GetPokemonStatsTool {
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

  async execute(identifier: string): Promise<ToolResponse> {
    const pokemon = this.getPokemonData(identifier);

    if (!pokemon) {
      return this.formatter.formatNotFound(identifier);
    }

    const stats = this.getPokemonStatsData(pokemon.id);
    const types = this.getPokemonTypes(pokemon.id);
    const abilities = this.getPokemonAbilities(pokemon.id);

    // Convert to PokemonData format
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
        name: type,
        slot: index + 1,
      })),
      abilities: abilities.map((ability, index) => ({
        name: ability.name,
        is_hidden: ability.is_hidden,
        slot: index + 1,
      })),
    };

    return this.formatter.formatPokemonStats(pokemonData);
  }
}
