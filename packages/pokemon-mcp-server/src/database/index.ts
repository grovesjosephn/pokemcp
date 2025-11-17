/**
 * Centralized Database Query Modules
 *
 * This module provides a unified interface to all database operations,
 * separating SQL queries from business logic and enabling better
 * maintainability and testing.
 */

import Database from 'better-sqlite3';
import { PokemonQueries } from './pokemonQueries.js';
import { StatsQueries } from './statsQueries.js';
import { TypesQueries } from './typesQueries.js';
import { AbilitiesQueries } from './abilitiesQueries.js';
import { SearchQueries } from './searchQueries.js';

/**
 * Main database service that provides access to all query modules
 */
export class DatabaseService {
  public readonly pokemon: PokemonQueries;
  public readonly stats: StatsQueries;
  public readonly types: TypesQueries;
  public readonly abilities: AbilitiesQueries;
  public readonly search: SearchQueries;

  constructor(private db: Database.Database) {
    // Initialize all query modules
    this.pokemon = new PokemonQueries(db);
    this.stats = new StatsQueries(db);
    this.types = new TypesQueries(db);
    this.abilities = new AbilitiesQueries(db);
    this.search = new SearchQueries(db);
  }

  /**
   * Get the underlying database instance
   * Use sparingly - prefer using the query modules
   */
  getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Check database health
   */
  isHealthy(): boolean {
    try {
      // Simple query to check if database is accessible
      this.db.prepare('SELECT 1').get();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get database statistics
   */
  getStats(): DatabaseStats {
    try {
      const pokemonCount = this.db
        .prepare('SELECT COUNT(*) as count FROM pokemon')
        .get() as { count: number };
      const typesCount = this.db
        .prepare('SELECT COUNT(*) as count FROM types')
        .get() as { count: number };
      const abilitiesCount = this.db
        .prepare('SELECT COUNT(*) as count FROM abilities')
        .get() as { count: number };

      return {
        pokemon: pokemonCount.count,
        types: typesCount.count,
        abilities: abilitiesCount.count,
        healthy: true,
      };
    } catch (error) {
      return {
        pokemon: 0,
        types: 0,
        abilities: 0,
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Database statistics interface
 */
export interface DatabaseStats {
  pokemon: number;
  types: number;
  abilities: number;
  healthy: boolean;
  error?: string;
}

// Re-export all query modules and types for convenience
export { PokemonQueries, PokemonDataExtractor } from './pokemonQueries.js';
export { StatsQueries } from './statsQueries.js';
export { TypesQueries } from './typesQueries.js';
export { AbilitiesQueries } from './abilitiesQueries.js';
export { SearchQueries } from './searchQueries.js';

// Re-export base types and interfaces
export * from './base.js';

// Re-export specific result interfaces
export type { CompleteRow } from './pokemonQueries.js';
export type { StrongestPokemonRow } from './statsQueries.js';
export type { PokemonByTypeRow } from './typesQueries.js';
export type { AbilityData, PokemonByAbilityRow } from './abilitiesQueries.js';
export type { PokemonSearchFilter, SearchResultRow } from './searchQueries.js';
