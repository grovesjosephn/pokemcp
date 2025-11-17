import Database from 'better-sqlite3';
import { BaseQueryModule, AbilityRow } from './base.js';

/**
 * Centralized Abilities-related database queries
 * Handles Pokemon abilities operations
 */
export class AbilitiesQueries extends BaseQueryModule {
  protected prepareStatements(): void {
    // Get all abilities for a Pokemon
    this.prepare(
      'abilitiesByPokemonId',
      `
      SELECT a.name, pa.is_hidden
      FROM pokemon_abilities pa
      JOIN abilities a ON pa.ability_id = a.id
      WHERE pa.pokemon_id = ?
      ORDER BY pa.slot
    `
    );

    // Get Pokemon with a specific ability
    this.prepare(
      'pokemonByAbility',
      `
      SELECT p.name, p.id, p.generation
      FROM pokemon p
      JOIN pokemon_abilities pa ON p.id = pa.pokemon_id
      JOIN abilities a ON pa.ability_id = a.id
      WHERE LOWER(a.name) = LOWER(?)
      ORDER BY p.id
      LIMIT ?
    `
    );

    // Check if ability exists
    this.prepare(
      'abilityExists',
      'SELECT id FROM abilities WHERE LOWER(name) = LOWER(?)'
    );
  }

  /**
   * Get all abilities for a Pokemon
   */
  getAbilitiesByPokemonId(pokemonId: number): AbilityData[] {
    const rows = this.getStatement('abilitiesByPokemonId').all(
      pokemonId
    ) as RawAbilityRow[];
    return rows.map((row) => ({
      name: row.name,
      is_hidden: Boolean(row.is_hidden),
    }));
  }

  /**
   * Get Pokemon that have a specific ability
   */
  getPokemonByAbility(
    abilityName: string,
    limit: number = 20
  ): PokemonByAbilityRow[] {
    return this.getStatement('pokemonByAbility').all(
      abilityName,
      limit
    ) as PokemonByAbilityRow[];
  }

  /**
   * Check if an ability exists in the database
   */
  abilityExists(abilityName: string): boolean {
    const result = this.getStatement('abilityExists').get(abilityName);
    return result !== undefined;
  }

  /**
   * Build condition for ability filtering in dynamic queries
   */
  buildAbilityCondition(): string {
    return `EXISTS (
      SELECT 1 FROM pokemon_abilities pa2
      JOIN abilities a2 ON pa2.ability_id = a2.id
      WHERE pa2.pokemon_id = p.id AND LOWER(a2.name) = LOWER(?)
    )`;
  }

  /**
   * Build JOIN clause for ability filtering
   */
  buildAbilityJoin(): string {
    return `
      JOIN pokemon_abilities pa ON p.id = pa.pokemon_id
      JOIN abilities a ON pa.ability_id = a.id
    `;
  }

  /**
   * Validate ability name format
   */
  isValidAbilityName(abilityName: string): boolean {
    return (
      typeof abilityName === 'string' &&
      abilityName.length > 0 &&
      abilityName.length <= 100 &&
      /^[a-zA-Z0-9\s-]+$/.test(abilityName)
    );
  }

  /**
   * Format ability name for display
   */
  formatAbilityName(abilityName: string): string {
    return abilityName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Group abilities by hidden status
   */
  groupAbilitiesByHidden(abilities: AbilityData[]): {
    normal: AbilityData[];
    hidden: AbilityData[];
  } {
    return abilities.reduce(
      (groups, ability) => {
        if (ability.is_hidden) {
          groups.hidden.push(ability);
        } else {
          groups.normal.push(ability);
        }
        return groups;
      },
      { normal: [], hidden: [] } as {
        normal: AbilityData[];
        hidden: AbilityData[];
      }
    );
  }
}

/**
 * Raw ability row from database (is_hidden as number)
 */
interface RawAbilityRow {
  name: string;
  is_hidden: number;
}

/**
 * Processed ability data (is_hidden as boolean)
 */
export interface AbilityData {
  name: string;
  is_hidden: boolean;
}

/**
 * Interface for Pokemon by ability query results
 */
export interface PokemonByAbilityRow {
  name: string;
  id: number;
  generation: number;
}
