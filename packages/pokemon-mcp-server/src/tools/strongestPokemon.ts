import Database from 'better-sqlite3';
import { StrongestArgs, ToolResponse } from '../types/index.js';

export class StrongestPokemonTool {
  constructor(private db: Database.Database) {}

  async execute(args: StrongestArgs): Promise<ToolResponse> {
    const { criteria, type, generation, limit = 10 } = args;

    let statColumn: string;
    switch (criteria) {
      case 'total_stats':
        statColumn = 'SUM(s.base_stat)';
        break;
      case 'attack':
      case 'defense':
      case 'hp':
      case 'speed':
      case 'sp_attack':
      case 'sp_defense':
        statColumn = 's.base_stat';
        break;
      default:
        throw new Error('Invalid criteria');
    }

    let query = `
      SELECT p.name, p.id, p.generation, ${statColumn} as stat_value
      FROM pokemon p
      JOIN stats s ON p.id = s.pokemon_id
    `;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (criteria !== 'total_stats') {
      conditions.push('s.stat_name = ?');
      params.push(criteria.replace('_', '-'));
    }

    if (type) {
      query += ` JOIN pokemon_types pt ON p.id = pt.pokemon_id
                 JOIN types t ON pt.type_id = t.id`;
      conditions.push('LOWER(t.name) = LOWER(?)');
      params.push(type);
    }

    if (generation) {
      conditions.push('p.generation = ?');
      params.push(generation);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (criteria === 'total_stats') {
      query += ` GROUP BY p.id, p.name, p.generation`;
    }

    query += ` ORDER BY stat_value DESC LIMIT ?`;
    params.push(limit);

    const results = this.db.prepare(query).all(...params) as Array<{
      name: string;
      id: number;
      generation: number;
      stat_value: number;
    }>;

    const resultText = `# Strongest Pokemon by ${criteria.replace('_', ' ')}

${results
  .map(
    (p, index) =>
      `${index + 1}. **${p.name}** (#${p.id}) - Gen ${p.generation}
   ${criteria.replace('_', ' ')}: ${p.stat_value}`
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
