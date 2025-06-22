import Database from 'better-sqlite3';
import { ToolResponse } from '../types/index.js';
import {
  ResponseFormatter,
  TypeEffectivenessData,
  MarkdownFormatter,
} from '../formatters/index.js';

export class GetTypeEffectivenessTool {
  private formatter: ResponseFormatter;

  constructor(
    private db: Database.Database,
    formatter?: ResponseFormatter
  ) {
    this.formatter = formatter || new MarkdownFormatter();
  }

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

    let pokemonList: Array<{ id: number; name: string; generation: number }> =
      [];

    if (includePokemon) {
      pokemonList = this.db
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
    }

    const typeEffectivenessData: TypeEffectivenessData = {
      typeName: type,
      includePokemon,
      pokemonList,
    };

    return this.formatter.formatTypeEffectiveness(typeEffectivenessData);
  }
}
