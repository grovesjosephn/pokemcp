import Database from 'better-sqlite3';
import { BaseQueryModule, TypeRow } from './base.js';

/**
 * Centralized Types-related database queries
 * Handles Pokemon type operations and type effectiveness
 */
export class TypesQueries extends BaseQueryModule {
  protected prepareStatements(): void {
    // Type existence check
    this.prepare(
      'typeExists',
      'SELECT id FROM types WHERE LOWER(name) = LOWER(?)'
    );

    // Get all types for a Pokemon
    this.prepare(
      'typesByPokemonId',
      `
      SELECT t.name
      FROM pokemon_types pt
      JOIN types t ON pt.type_id = t.id
      WHERE pt.pokemon_id = ?
      ORDER BY pt.slot
    `
    );

    // Get Pokemon with a specific type
    this.prepare(
      'pokemonByType',
      `
      SELECT p.name, p.id, p.generation
      FROM pokemon p
      JOIN pokemon_types pt ON p.id = pt.pokemon_id
      JOIN types t ON pt.type_id = t.id
      WHERE LOWER(t.name) = LOWER(?)
      ORDER BY p.id
      LIMIT ?
    `
    );

    // Note: pokemonHasType is a helper method that returns SQL, not a prepared statement
  }

  /**
   * Check if a type exists in the database
   */
  typeExists(typeName: string): boolean {
    const result = this.getStatement('typeExists').get(typeName);
    return result !== undefined;
  }

  /**
   * Get all types for a Pokemon
   */
  getTypesByPokemonId(pokemonId: number): string[] {
    const rows = this.getStatement('typesByPokemonId').all(pokemonId) as {
      name: string;
    }[];
    return rows.map((row) => row.name);
  }

  /**
   * Get Pokemon that have a specific type
   */
  getPokemonByType(typeName: string, limit: number = 20): PokemonByTypeRow[] {
    return this.getStatement('pokemonByType').all(
      typeName,
      limit
    ) as PokemonByTypeRow[];
  }

  /**
   * Build condition for type filtering in dynamic queries
   * Returns the SQL condition string to be used in WHERE clauses
   */
  buildTypeCondition(): string {
    return `EXISTS (
      SELECT 1 FROM pokemon_types pt2
      JOIN types t2 ON pt2.type_id = t2.id
      WHERE pt2.pokemon_id = p.id AND LOWER(t2.name) = LOWER(?)
    )`;
  }

  /**
   * Build JOIN clause for type filtering when needed in FROM clause
   * Returns the SQL JOIN string to be added to queries
   */
  buildTypeJoin(): string {
    return `
      JOIN pokemon_types pt ON p.id = pt.pokemon_id
      JOIN types t ON pt.type_id = t.id
    `;
  }

  /**
   * Validate type name format
   */
  isValidTypeName(typeName: string): boolean {
    // Basic validation - could be expanded with allowed type list
    return (
      typeof typeName === 'string' &&
      typeName.length > 0 &&
      typeName.length <= 50 &&
      /^[a-zA-Z-]+$/.test(typeName)
    );
  }

  /**
   * Format type name for display
   */
  formatTypeName(typeName: string): string {
    return typeName.charAt(0).toUpperCase() + typeName.slice(1).toLowerCase();
  }
}

/**
 * Interface for Pokemon by type query results
 */
export interface PokemonByTypeRow {
  name: string;
  id: number;
  generation: number;
}
