import Database from 'better-sqlite3';
import { Pokemon, Stat, Type, Ability, ToolResponse } from '../types/index.js';
import {
  ResponseFormatter,
  PokemonData,
  MarkdownFormatter,
} from '../formatters/index.js';

interface PokemonCompleteRow {
  // Pokemon data
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  generation: number;
  species_url: string;
  sprite_url: string;
  // Stats data
  stat_name: string | null;
  base_stat: number | null;
  effort: number | null;
  // Type data
  type_name: string | null;
  type_slot: number | null;
  // Ability data
  ability_name: string | null;
  is_hidden: boolean | null;
  ability_slot: number | null;
}

export class GetPokemonTool {
  private preparedQuery: Database.Statement | null = null;
  private formatter: ResponseFormatter;

  constructor(
    private db: Database.Database,
    formatter?: ResponseFormatter
  ) {
    // Default to markdown formatter for backward compatibility
    this.formatter = formatter || new MarkdownFormatter();
    // Pre-prepare the optimized query for better performance
    this.preparedQuery = this.db.prepare(`
      SELECT 
        p.*,
        s.stat_name, s.base_stat, s.effort,
        t.name as type_name, pt.slot as type_slot,
        a.name as ability_name, pa.is_hidden, pa.slot as ability_slot
      FROM pokemon p
      LEFT JOIN stats s ON p.id = s.pokemon_id
      LEFT JOIN pokemon_types pt ON p.id = pt.pokemon_id
      LEFT JOIN types t ON pt.type_id = t.id
      LEFT JOIN pokemon_abilities pa ON p.id = pa.pokemon_id
      LEFT JOIN abilities a ON pa.ability_id = a.id
      WHERE p.id = ? OR LOWER(p.name) = LOWER(?)
      ORDER BY s.stat_name, pt.slot, pa.slot
    `);
  }

  async execute(identifier: string): Promise<ToolResponse> {
    if (!this.preparedQuery) {
      throw new Error('Database query not prepared');
    }

    // Execute single optimized query
    const rows = this.preparedQuery.all(
      identifier,
      identifier
    ) as PokemonCompleteRow[];

    if (rows.length === 0) {
      return this.formatter.formatNotFound(identifier);
    }

    // Process the denormalized data and convert to PokemonData format
    const pokemon = this.extractPokemonData(rows[0]);
    const stats = this.extractStats(rows);
    const types = this.extractTypes(rows);
    const abilities = this.extractAbilities(rows);

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
        is_hidden: ability.is_hidden,
        slot: index + 1,
      })),
    };

    return this.formatter.formatPokemon(pokemonData);
  }

  private extractPokemonData(row: PokemonCompleteRow): Pokemon {
    return {
      id: row.id,
      name: row.name,
      height: row.height,
      weight: row.weight,
      base_experience: row.base_experience,
      generation: row.generation,
      species_url: row.species_url,
      sprite_url: row.sprite_url,
    };
  }

  private extractStats(rows: PokemonCompleteRow[]): Stat[] {
    const statsMap = new Map<string, Stat>();

    for (const row of rows) {
      if (row.stat_name && row.base_stat !== null && row.effort !== null) {
        if (!statsMap.has(row.stat_name)) {
          statsMap.set(row.stat_name, {
            stat_name: row.stat_name,
            base_stat: row.base_stat,
            effort: row.effort,
          });
        }
      }
    }

    // Return stats in consistent order
    const statOrder = [
      'hp',
      'attack',
      'defense',
      'special-attack',
      'special-defense',
      'speed',
    ];
    return statOrder
      .map((statName) => statsMap.get(statName))
      .filter((stat): stat is Stat => stat !== undefined);
  }

  private extractTypes(rows: PokemonCompleteRow[]): Type[] {
    const typesMap = new Map<number, Type>();

    for (const row of rows) {
      if (row.type_name && row.type_slot !== null) {
        typesMap.set(row.type_slot, {
          name: row.type_name,
        });
      }
    }

    // Return types ordered by slot
    return Array.from(typesMap.entries())
      .sort(([slotA], [slotB]) => slotA - slotB)
      .map(([, type]) => type);
  }

  private extractAbilities(rows: PokemonCompleteRow[]): Ability[] {
    const abilitiesMap = new Map<number, Ability>();

    for (const row of rows) {
      if (
        row.ability_name &&
        row.is_hidden !== null &&
        row.ability_slot !== null
      ) {
        abilitiesMap.set(row.ability_slot, {
          name: row.ability_name,
          is_hidden: row.is_hidden,
        });
      }
    }

    // Return abilities ordered by slot
    return Array.from(abilitiesMap.entries())
      .sort(([slotA], [slotB]) => slotA - slotB)
      .map(([, ability]) => ability);
  }
}
