import Database from 'better-sqlite3';
import { BaseQueryModule, StatRow, StatsCriteria } from './base.js';

/**
 * Centralized Stats-related database queries
 * Handles Pokemon statistics operations and rankings
 */
export class StatsQueries extends BaseQueryModule {
  protected prepareStatements(): void {
    // Basic stats lookup with consistent ordering
    this.prepare(
      'statsByPokemonId',
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
    );

    // Base query for strongest Pokemon rankings (will be dynamically modified)
    this.prepare(
      'strongestBase',
      `
      SELECT p.name, p.id, p.generation, ? as stat_value
      FROM pokemon p
      JOIN stats s ON p.id = s.pokemon_id
    `
    );
  }

  /**
   * Get all stats for a Pokemon with consistent ordering
   */
  getStatsByPokemonId(pokemonId: number): StatRow[] {
    return this.getStatement('statsByPokemonId').all(pokemonId) as StatRow[];
  }

  /**
   * Get strongest Pokemon by various criteria
   * This uses dynamic query building for complex filtering and aggregation
   */
  getStrongestPokemon(criteria: StatsCriteria): StrongestPokemonRow[] {
    const query = this.buildStrongestQuery(criteria);
    const params = this.buildStrongestParams(criteria);

    // Execute the dynamic query
    const statement = this.db.prepare(query);
    return statement.all(...params) as StrongestPokemonRow[];
  }

  /**
   * Build dynamic query for strongest Pokemon based on criteria
   */
  private buildStrongestQuery(criteria: StatsCriteria): string {
    const { criteria: statCriteria, type, generation, limit = 10 } = criteria;

    // Determine the stat column to use
    let statColumn: string;
    if (statCriteria === 'total_stats') {
      statColumn = 'SUM(s.base_stat)';
    } else {
      statColumn = 's.base_stat';
    }

    let query = `
      SELECT p.name, p.id, p.generation, ${statColumn} as stat_value
      FROM pokemon p
      JOIN stats s ON p.id = s.pokemon_id
    `;

    const conditions: string[] = [];

    // Add stat name filter for non-total stats
    if (statCriteria !== 'total_stats') {
      conditions.push('s.stat_name = ?');
    }

    // Add type filter if specified
    if (type) {
      query += `
        JOIN pokemon_types pt ON p.id = pt.pokemon_id
        JOIN types t ON pt.type_id = t.id
      `;
      conditions.push('LOWER(t.name) = LOWER(?)');
    }

    // Add generation filter if specified
    if (generation) {
      conditions.push('p.generation = ?');
    }

    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add GROUP BY for total stats
    if (statCriteria === 'total_stats') {
      query += ` GROUP BY p.id, p.name, p.generation`;
    }

    // Add ordering and limit
    query += ` ORDER BY stat_value DESC LIMIT ?`;

    return query;
  }

  /**
   * Build parameters array for strongest Pokemon query
   */
  private buildStrongestParams(criteria: StatsCriteria): (string | number)[] {
    const { criteria: statCriteria, type, generation, limit = 10 } = criteria;
    const params: (string | number)[] = [];

    // Add stat name parameter for non-total stats
    if (statCriteria !== 'total_stats') {
      params.push(statCriteria.replace('_', '-')); // Convert sp_attack to special-attack
    }

    // Add type parameter if specified
    if (type) {
      params.push(type);
    }

    // Add generation parameter if specified
    if (generation) {
      params.push(generation);
    }

    // Add limit parameter
    params.push(limit);

    return params;
  }

  /**
   * Calculate total stats for a Pokemon
   */
  calculateTotalStats(stats: StatRow[]): number {
    return stats.reduce((sum, stat) => sum + stat.base_stat, 0);
  }

  /**
   * Get stat name in display format
   */
  formatStatName(statName: string): string {
    return statName.replace('-', ' ').toUpperCase();
  }
}

/**
 * Interface for strongest Pokemon query results
 */
export interface StrongestPokemonRow {
  name: string;
  id: number;
  generation: number;
  stat_value: number;
}
