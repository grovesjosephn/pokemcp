import Database from 'better-sqlite3';

/**
 * Base class for all database query modules
 * Provides common functionality and prepared statement management
 */
export abstract class BaseQueryModule {
  protected statements: Map<string, Database.Statement> = new Map();

  constructor(protected db: Database.Database) {
    this.prepareStatements();
  }

  /**
   * Abstract method for each module to prepare its statements
   */
  protected abstract prepareStatements(): void;

  /**
   * Helper to prepare and cache a statement
   */
  protected prepare(key: string, sql: string): Database.Statement {
    const statement = this.db.prepare(sql);
    this.statements.set(key, statement);
    return statement;
  }

  /**
   * Get a prepared statement by key
   */
  protected getStatement(key: string): Database.Statement {
    const statement = this.statements.get(key);
    if (!statement) {
      throw new Error(
        `Statement '${key}' not found. Ensure it's prepared in prepareStatements()`
      );
    }
    return statement;
  }

  /**
   * Helper for identifier-based lookup (ID or name)
   */
  protected isNumericId(identifier: string): boolean {
    return /^\d+$/.test(identifier);
  }
}

/**
 * Common filter interfaces for query builders
 */
export interface PokemonFilter {
  id?: number;
  name?: string;
  generation?: number;
  type?: string;
  minStat?: number;
  limit?: number;
}

export interface StatsCriteria {
  criteria:
    | 'total_stats'
    | 'attack'
    | 'defense'
    | 'hp'
    | 'speed'
    | 'sp_attack'
    | 'sp_defense';
  type?: string;
  generation?: number;
  limit?: number;
}

/**
 * Common database result interfaces
 */
export interface PokemonRow {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  generation: number;
  species_url: string;
  sprite_url: string;
}

export interface StatRow {
  stat_name: string;
  base_stat: number;
  effort: number;
}

export interface TypeRow {
  name: string;
  slot?: number;
}

export interface AbilityRow {
  name: string;
  is_hidden: number | boolean;
  slot?: number;
}
