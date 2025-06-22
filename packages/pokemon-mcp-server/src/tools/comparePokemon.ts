import Database from 'better-sqlite3';
import { Pokemon, Stat, ToolResponse } from '../types/index.js';

export class ComparePokemonTool {
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

  async execute(
    identifier1: string,
    identifier2: string
  ): Promise<ToolResponse> {
    const pokemon1 = this.getPokemonData(identifier1);
    const pokemon2 = this.getPokemonData(identifier2);

    if (!pokemon1 || !pokemon2) {
      return {
        content: [
          {
            type: 'text',
            text: `One or both Pokemon not found: "${identifier1}", "${identifier2}"`,
          },
        ],
      };
    }

    const stats1 = this.getPokemonStatsData(pokemon1.id);
    const stats2 = this.getPokemonStatsData(pokemon2.id);

    const comparison = `# Pokemon Comparison

## ${pokemon1.name} vs ${pokemon2.name}

| Attribute | ${pokemon1.name} | ${pokemon2.name} |
|-----------|${'-'.repeat(pokemon1.name.length)}|${'-'.repeat(pokemon2.name.length)}|
| ID | #${pokemon1.id} | #${pokemon2.id} |
| Generation | ${pokemon1.generation} | ${pokemon2.generation} |
| Height | ${pokemon1.height / 10}m | ${pokemon2.height / 10}m |
| Weight | ${pokemon1.weight / 10}kg | ${pokemon2.weight / 10}kg |

## Stat Comparison

| Stat | ${pokemon1.name} | ${pokemon2.name} | Difference |
|------|${'-'.repeat(pokemon1.name.length)}|${'-'.repeat(pokemon2.name.length)}|------------|
${stats1
  .map((stat) => {
    const stat2 = stats2.find((s) => s.stat_name === stat.stat_name);
    const diff = stat.base_stat - (stat2?.base_stat ?? 0);
    const diffStr = diff > 0 ? `+${diff}` : diff.toString();
    return `| ${stat.stat_name} | ${stat.base_stat} | ${stat2?.base_stat ?? 0} | ${diffStr} |`;
  })
  .join('\n')}

**Total Stats:** ${stats1.reduce((sum, s) => sum + s.base_stat, 0)} vs ${stats2.reduce((sum, s) => sum + s.base_stat, 0)}`;

    return {
      content: [
        {
          type: 'text',
          text: comparison,
        },
      ],
    };
  }
}
