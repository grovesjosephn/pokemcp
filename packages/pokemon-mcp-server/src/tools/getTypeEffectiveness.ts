import Database from 'better-sqlite3';
import { ToolResponse } from '../types/index.js';

export class GetTypeEffectivenessTool {
  constructor(private db: Database.Database) {}

  async execute(type: string, includePokemon = false): Promise<ToolResponse> {
    // Check if type exists
    const typeExists = this.db
      .prepare('SELECT id FROM types WHERE LOWER(name) = LOWER(?)')
      .get(type);

    if (!typeExists) {
      return {
        content: [
          {
            type: 'text',
            text: `Type "${type}" not found.`,
          },
        ],
      };
    }

    let result = `# ${type.charAt(0).toUpperCase() + type.slice(1)} Type Analysis\n\n`;

    if (includePokemon) {
      const pokemon = this.db
        .prepare(
          `
        SELECT p.name, p.id, p.generation
        FROM pokemon p
        JOIN pokemon_types pt ON p.id = pt.pokemon_id
        JOIN types t ON pt.type_id = t.id
        WHERE LOWER(t.name) = LOWER(?)
        ORDER BY p.id
        LIMIT 20
      `
        )
        .all(type) as Array<{ name: string; id: number; generation: number }>;

      result += `## Pokemon with ${type} type (showing first 20):\n\n`;
      result += pokemon
        .map((p) => `- **${p.name}** (#${p.id}) - Gen ${p.generation}`)
        .join('\n');
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  }
}
