import Database from 'better-sqlite3';
import { SearchArgs, ToolResponse } from '../types/index.js';

export class SearchPokemonTool {
  constructor(private db: Database.Database) {}

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

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No Pokemon found matching the specified criteria.',
          },
        ],
      };
    }

    const resultText = `# Search Results (${results.length} found)

${results
  .map(
    (p) =>
      `**${p.name.charAt(0).toUpperCase() + p.name.slice(1)}** (#${p.id}) - Gen ${p.generation}
  Types: ${p.types}`
  )
  .join('\n\n')}`;

    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  }
}
