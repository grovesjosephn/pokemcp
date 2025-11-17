import Database from 'better-sqlite3';
import {
  BaseQueryModule,
  PokemonRow,
  StatRow,
  TypeRow,
  AbilityRow,
} from './base.js';

/**
 * Centralized Pokemon-related database queries
 * Handles all Pokemon entity operations and related data fetching
 */
export class PokemonQueries extends BaseQueryModule {
  protected prepareStatements(): void {
    // Core Pokemon lookups
    this.prepare('pokemonById', 'SELECT * FROM pokemon WHERE id = ?');
    this.prepare(
      'pokemonByName',
      'SELECT * FROM pokemon WHERE LOWER(name) = LOWER(?)'
    );

    // Optimized single query for complete Pokemon data (from GetPokemonTool)
    this.prepare(
      'pokemonComplete',
      `
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
    `
    );
  }

  /**
   * Get Pokemon by ID
   */
  getPokemonById(id: number): PokemonRow | undefined {
    return this.getStatement('pokemonById').get(id) as PokemonRow | undefined;
  }

  /**
   * Get Pokemon by name (case-insensitive)
   */
  getPokemonByName(name: string): PokemonRow | undefined {
    return this.getStatement('pokemonByName').get(name) as
      | PokemonRow
      | undefined;
  }

  /**
   * Get Pokemon by identifier (ID or name)
   */
  getPokemon(identifier: string): PokemonRow | undefined {
    if (this.isNumericId(identifier)) {
      return this.getPokemonById(parseInt(identifier));
    } else {
      return this.getPokemonByName(identifier);
    }
  }

  /**
   * Get complete Pokemon data with all related information in a single query
   * Returns denormalized data that needs to be processed
   */
  getPokemonComplete(identifier: string): CompleteRow[] {
    return this.getStatement('pokemonComplete').all(
      identifier,
      identifier
    ) as CompleteRow[];
  }
}

/**
 * Interface for the denormalized complete Pokemon query result
 */
export interface CompleteRow extends PokemonRow {
  // Stats fields
  stat_name?: string;
  base_stat?: number;
  effort?: number;

  // Types fields
  type_name?: string;
  type_slot?: number;

  // Abilities fields
  ability_name?: string;
  is_hidden?: number;
  ability_slot?: number;
}

/**
 * Helper functions to extract data from the denormalized complete query result
 */
export class PokemonDataExtractor {
  /**
   * Extract Pokemon basic info from the first row
   */
  static extractPokemon(rows: CompleteRow[]): PokemonRow {
    if (rows.length === 0) {
      throw new Error('No rows provided');
    }

    const first = rows[0];
    return {
      id: first.id,
      name: first.name,
      height: first.height,
      weight: first.weight,
      base_experience: first.base_experience,
      generation: first.generation,
      species_url: first.species_url,
      sprite_url: first.sprite_url,
    };
  }

  /**
   * Extract unique stats from denormalized rows
   */
  static extractStats(rows: CompleteRow[]): StatRow[] {
    const statsMap = new Map<string, StatRow>();

    rows.forEach((row) => {
      if (
        row.stat_name &&
        row.base_stat !== undefined &&
        row.effort !== undefined
      ) {
        if (!statsMap.has(row.stat_name)) {
          statsMap.set(row.stat_name, {
            stat_name: row.stat_name,
            base_stat: row.base_stat,
            effort: row.effort,
          });
        }
      }
    });

    // Return in the consistent order used across tools
    const statOrder = [
      'hp',
      'attack',
      'defense',
      'special-attack',
      'special-defense',
      'speed',
    ];
    return statOrder
      .map((name) => statsMap.get(name))
      .filter((stat): stat is StatRow => stat !== undefined);
  }

  /**
   * Extract unique types from denormalized rows
   */
  static extractTypes(rows: CompleteRow[]): TypeRow[] {
    const typesMap = new Map<number, TypeRow>();

    rows.forEach((row) => {
      if (row.type_name && row.type_slot !== undefined) {
        if (!typesMap.has(row.type_slot)) {
          typesMap.set(row.type_slot, {
            name: row.type_name,
            slot: row.type_slot,
          });
        }
      }
    });

    // Return sorted by slot
    return Array.from(typesMap.values()).sort(
      (a, b) => (a.slot || 0) - (b.slot || 0)
    );
  }

  /**
   * Extract unique abilities from denormalized rows
   */
  static extractAbilities(rows: CompleteRow[]): AbilityRow[] {
    const abilitiesMap = new Map<number, AbilityRow>();

    rows.forEach((row) => {
      if (row.ability_name && row.ability_slot !== undefined) {
        if (!abilitiesMap.has(row.ability_slot)) {
          abilitiesMap.set(row.ability_slot, {
            name: row.ability_name,
            is_hidden: Boolean(row.is_hidden),
            slot: row.ability_slot,
          });
        }
      }
    });

    // Return sorted by slot
    return Array.from(abilitiesMap.values()).sort(
      (a, b) => (a.slot || 0) - (b.slot || 0)
    );
  }
}
