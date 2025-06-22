import Database from 'better-sqlite3';
import { SearchArgs, ToolResponse } from '../types/index.js';
import {
  ResponseFormatter,
  PokemonSearchResults,
  MarkdownFormatter,
} from '../formatters/index.js';

export class SearchPokemonTool {
  private formatter: ResponseFormatter;

  constructor(
    private db: Database.Database,
    formatter?: ResponseFormatter
  ) {
    this.formatter = formatter || new MarkdownFormatter();
  }

  async execute(args: SearchArgs): Promise<ToolResponse> {
    let query = `
      SELECT p.id, p.name, p.generation,
             GROUP_CONCAT(t.name) as types
      FROM pokemon p
      JOIN pokemon_types pt ON p.id = pt.pokemon_id
      JOIN types t ON pt.type_id = t.id
    `;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (args.type) {
      conditions.push(`EXISTS (
        SELECT 1 FROM pokemon_types pt2
        JOIN types t2 ON pt2.type_id = t2.id
        WHERE pt2.pokemon_id = p.id AND LOWER(t2.name) = LOWER(?)
      )`);
      params.push(args.type);
    }

    if (args.generation) {
      conditions.push('p.generation = ?');
      params.push(args.generation);
    }

    if (args.min_stat) {
      query += ` JOIN (
        SELECT pokemon_id, SUM(base_stat) as total_stats
        FROM stats
        GROUP BY pokemon_id
        HAVING total_stats >= ?
      ) stat_totals ON p.id = stat_totals.pokemon_id`;
      params.push(args.min_stat);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY p.id, p.name, p.generation
               ORDER BY p.id
               LIMIT ?`;

    params.push(args.limit || 20);

    const results = this.db.prepare(query).all(...params) as Array<{
      id: number;
      name: string;
      generation: number;
      types: string;
    }>;

    const searchResults: PokemonSearchResults = {
      criteria: args,
      totalCount: results.length,
      results: results.map((r) => ({
        id: r.id,
        name: r.name,
        generation: r.generation,
        types: r.types.split(',').map((type) => type.trim()),
      })),
    };

    return this.formatter.formatSearchResults(searchResults);
  }
}
