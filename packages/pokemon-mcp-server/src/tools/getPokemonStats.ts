import Database from 'better-sqlite3';
import { Pokemon, Stat, ToolResponse } from '../types/index.js';

export class GetPokemonStatsTool {
  constructor(private db: Database.Database) {}

  private getPokemonData(identifier: string): Pokemon | undefined {
    const isNumeric = /^\d+$/.test(identifier);
    const query = isNumeric
      ? 'SELECT * FROM pokemon WHERE id = ?'
      : 'SELECT * FROM pokemon WHERE LOWER(name) = LOWER(?)';

    return this.db.prepare(query).get(identifier) as Pokemon | undefined;
  }

  private getPokemonStatsData(pokemonId: number): Stat[] {
    return this.db
      .prepare(
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
      )
      .all(pokemonId) as Stat[];
  }

  async execute(identifier: string): Promise<ToolResponse> {
    const pokemon = this.getPokemonData(identifier);

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

    const stats = this.getPokemonStatsData(pokemon.id);
    const totalStats = stats.reduce((sum, stat) => sum + stat.base_stat, 0);

    const statsText = `# ${pokemon.name} - Detailed Stats

## Base Stats
${stats.map((s) => `**${s.stat_name}:** ${s.base_stat} (EV: ${s.effort})`).join('\n')}

**Total Base Stats:** ${totalStats}

## Stat Distribution
${stats
  .map((s) => {
    const percentage = ((s.base_stat / totalStats) * 100).toFixed(1);
    return `- ${s.stat_name}: ${percentage}% of total stats`;
  })
  .join('\n')}`;

    return {
      content: [
        {
          type: 'text',
          text: statsText,
        },
      ],
    };
  }
}
