import Database from 'better-sqlite3';
import { BaseQueryModule, PokemonFilter } from './base.js';

/**
 * Centralized Search-related database queries
 * Handles complex Pokemon search operations with dynamic filtering
 */
export class SearchQueries extends BaseQueryModule {
  protected prepareStatements(): void {
    // Base search query structure (will be dynamically modified)
    // This is just for reference - actual queries are built dynamically
    this.prepare(
      'searchBase',
      `
      SELECT p.id, p.name, p.generation,
             GROUP_CONCAT(t.name) as types
      FROM pokemon p
      JOIN pokemon_types pt ON p.id = pt.pokemon_id
      JOIN types t ON pt.type_id = t.id
    `
    );
  }

  /**
   * Search Pokemon with dynamic filtering
   * Builds query based on provided search criteria
   */
  searchPokemon(filter: PokemonSearchFilter): SearchResultRow[] {
    const query = this.buildSearchQuery(filter);
    const params = this.buildSearchParams(filter);

    // Execute the dynamic query
    const statement = this.db.prepare(query);
    return statement.all(...params) as SearchResultRow[];
  }

  /**
   * Build dynamic search query based on filter criteria
   */
  private buildSearchQuery(filter: PokemonSearchFilter): string {
    const { type, generation, minStat, limit = 20 } = filter;

    let query = `
      SELECT p.id, p.name, p.generation,
             GROUP_CONCAT(t.name) as types
      FROM pokemon p
      JOIN pokemon_types pt ON p.id = pt.pokemon_id
      JOIN types t ON pt.type_id = t.id
    `;

    const conditions: string[] = [];

    // Add type filter using EXISTS subquery for accuracy
    if (type) {
      conditions.push(`EXISTS (
        SELECT 1 FROM pokemon_types pt2
        JOIN types t2 ON pt2.type_id = t2.id
        WHERE pt2.pokemon_id = p.id AND LOWER(t2.name) = LOWER(?)
      )`);
    }

    // Add generation filter
    if (generation) {
      conditions.push('p.generation = ?');
    }

    // Add minimum stats filter with subquery
    if (minStat) {
      query += ` JOIN (
        SELECT pokemon_id, SUM(base_stat) as total_stats
        FROM stats
        GROUP BY pokemon_id
        HAVING total_stats >= ?
      ) stat_totals ON p.id = stat_totals.pokemon_id`;
    }

    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add GROUP BY, ORDER BY, and LIMIT
    query += `
      GROUP BY p.id, p.name, p.generation
      ORDER BY p.id
      LIMIT ?
    `;

    return query;
  }

  /**
   * Build parameters array for search query
   */
  private buildSearchParams(filter: PokemonSearchFilter): (string | number)[] {
    const { type, generation, minStat, limit = 20 } = filter;
    const params: (string | number)[] = [];

    // Add type parameter if specified
    if (type) {
      params.push(type);
    }

    // Add generation parameter if specified
    if (generation) {
      params.push(generation);
    }

    // Add minStat parameter if specified
    if (minStat) {
      params.push(minStat);
    }

    // Add limit parameter
    params.push(limit);

    return params;
  }

  /**
   * Count total results for a search (without limit)
   * Useful for pagination information
   */
  countSearchResults(filter: Omit<PokemonSearchFilter, 'limit'>): number {
    const countQuery = this.buildCountQuery(filter);
    const params = this.buildSearchParams({ ...filter, limit: 999999 }).slice(
      0,
      -1
    ); // Remove limit param

    const statement = this.db.prepare(countQuery);
    const result = statement.get(...params) as { count: number };
    return result.count;
  }

  /**
   * Build count query for search results
   */
  private buildCountQuery(filter: Omit<PokemonSearchFilter, 'limit'>): string {
    const { type, generation, minStat } = filter;

    let query = `
      SELECT COUNT(DISTINCT p.id) as count
      FROM pokemon p
      JOIN pokemon_types pt ON p.id = pt.pokemon_id
      JOIN types t ON pt.type_id = t.id
    `;

    const conditions: string[] = [];

    // Add type filter
    if (type) {
      conditions.push(`EXISTS (
        SELECT 1 FROM pokemon_types pt2
        JOIN types t2 ON pt2.type_id = t2.id
        WHERE pt2.pokemon_id = p.id AND LOWER(t2.name) = LOWER(?)
      )`);
    }

    // Add generation filter
    if (generation) {
      conditions.push('p.generation = ?');
    }

    // Add minimum stats filter
    if (minStat) {
      query += ` JOIN (
        SELECT pokemon_id, SUM(base_stat) as total_stats
        FROM stats
        GROUP BY pokemon_id
        HAVING total_stats >= ?
      ) stat_totals ON p.id = stat_totals.pokemon_id`;
    }

    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    return query;
  }

  /**
   * Validate search filter parameters
   */
  validateSearchFilter(filter: PokemonSearchFilter): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (filter.type && typeof filter.type !== 'string') {
      errors.push('Type must be a string');
    }

    if (
      filter.generation &&
      (!Number.isInteger(filter.generation) ||
        filter.generation < 1 ||
        filter.generation > 9)
    ) {
      errors.push('Generation must be an integer between 1 and 9');
    }

    if (
      filter.minStat &&
      (!Number.isInteger(filter.minStat) ||
        filter.minStat < 0 ||
        filter.minStat > 1000)
    ) {
      errors.push('Minimum stat must be an integer between 0 and 1000');
    }

    if (
      filter.limit &&
      (!Number.isInteger(filter.limit) ||
        filter.limit < 1 ||
        filter.limit > 100)
    ) {
      errors.push('Limit must be an integer between 1 and 100');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Parse concatenated types string from GROUP_CONCAT
   */
  parseTypesString(typesStr: string): string[] {
    if (!typesStr) return [];
    return typesStr.split(',').map((type) => type.trim());
  }
}

/**
 * Extended search filter interface
 */
export interface PokemonSearchFilter {
  type?: string;
  generation?: number;
  minStat?: number;
  limit?: number;
}

/**
 * Search result row interface
 */
export interface SearchResultRow {
  id: number;
  name: string;
  generation: number;
  types: string; // Comma-separated string from GROUP_CONCAT
}
