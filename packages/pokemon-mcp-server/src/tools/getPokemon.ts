import Database from 'better-sqlite3';
import { Pokemon, Stat, Type, Ability, ToolResponse } from '../types/index.js';

export class GetPokemonTool {
  constructor(private db: Database.Database) {}

  async execute(identifier: string): Promise<ToolResponse> {
    const isNumeric = /^\d+$/.test(identifier);
    const query = isNumeric
      ? 'SELECT * FROM pokemon WHERE id = ?'
      : 'SELECT * FROM pokemon WHERE LOWER(name) = LOWER(?)';

    const pokemon = this.db.prepare(query).get(identifier) as
      | Pokemon
      | undefined;

    if (!pokemon) {
      return {
        content: [
          {
            type: 'text',
            text: `Pokemon "${identifier}" not found.`,
          },
        ],
      };
    }

    // Get additional details
    const stats = this.db
      .prepare(
        `
      SELECT stat_name, base_stat, effort
      FROM stats
      WHERE pokemon_id = ?
    `
      )
      .all(pokemon.id) as Stat[];

    const types = this.db
      .prepare(
        `
      SELECT t.name
      FROM types t
      JOIN pokemon_types pt ON t.id = pt.type_id
      WHERE pt.pokemon_id = ?
      ORDER BY pt.slot
    `
      )
      .all(pokemon.id) as Type[];

    const abilities = this.db
      .prepare(
        `
      SELECT a.name, pa.is_hidden
      FROM abilities a
      JOIN pokemon_abilities pa ON a.id = pa.ability_id
      WHERE pa.pokemon_id = ?
      ORDER BY pa.slot
    `
      )
      .all(pokemon.id) as Ability[];

    const totalStats = stats.reduce((sum, stat) => sum + stat.base_stat, 0);

    return {
      content: [
        {
          type: 'text',
          text: `# ${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} (#${pokemon.id})

**Basic Info:**
- Generation: ${pokemon.generation}
- Height: ${pokemon.height / 10}m
- Weight: ${pokemon.weight / 10}kg
- Base Experience: ${pokemon.base_experience}

**Types:** ${types.map((t) => t.name).join(', ')}

**Abilities:** ${abilities.map((a) => a.name + (a.is_hidden ? ' (Hidden)' : '')).join(', ')}

**Base Stats:**
${stats.map((s) => `- ${s.stat_name}: ${s.base_stat}`).join('\n')}
- **Total: ${totalStats}**`,
        },
      ],
    };
  }
}
