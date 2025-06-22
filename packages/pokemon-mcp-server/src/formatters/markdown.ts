import {
  ResponseFormatter,
  PokemonData,
  PokemonComparisonData,
  PokemonSearchResults,
  TypeEffectivenessData,
} from './base.js';
import { ToolResponse } from '../types/index.js';

/**
 * Markdown formatter - implements the current formatting logic
 * Provides rich text formatting suitable for LLM consumption
 */
export class MarkdownFormatter extends ResponseFormatter {
  formatPokemon(pokemon: PokemonData): ToolResponse {
    const pokemonName = this.capitalizeName(pokemon.name);
    const totalStats = this.calculateStatsTotal(pokemon.stats);

    const response = `# ${pokemonName} (#${pokemon.id})

**Basic Info:**
- Generation: ${pokemon.generation}
- Height: ${this.formatHeight(pokemon.height)}
- Weight: ${this.formatWeight(pokemon.weight)}
- Base Experience: ${pokemon.base_experience}

**Types:** ${pokemon.types.map((t) => t.name).join(', ')}

**Abilities:** ${pokemon.abilities.map((a) => a.name + (a.is_hidden ? ' (Hidden)' : '')).join(', ')}

**Base Stats:**
${pokemon.stats.map((s) => `- ${s.stat_name}: ${s.base_stat}`).join('\n')}
- **Total: ${totalStats}**`;

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  formatComparison(comparison: PokemonComparisonData): ToolResponse {
    const { pokemon1, pokemon2 } = comparison;
    const pokemon1Name = this.capitalizeName(pokemon1.name);
    const pokemon2Name = this.capitalizeName(pokemon2.name);

    const comparisonText = `# Pokemon Comparison

## ${pokemon1Name} vs ${pokemon2Name}

| Attribute | ${pokemon1Name} | ${pokemon2Name} |
|-----------|${'-'.repeat(pokemon1Name.length)}|${'-'.repeat(pokemon2Name.length)}|
| ID | #${pokemon1.id} | #${pokemon2.id} |
| Generation | ${pokemon1.generation} | ${pokemon2.generation} |
| Height | ${this.formatHeight(pokemon1.height)} | ${this.formatHeight(pokemon2.height)} |
| Weight | ${this.formatWeight(pokemon1.weight)} | ${this.formatWeight(pokemon2.weight)} |

## Stat Comparison

| Stat | ${pokemon1Name} | ${pokemon2Name} | Difference |
|------|${'-'.repeat(pokemon1Name.length)}|${'-'.repeat(pokemon2Name.length)}|------------|
${pokemon1.stats
  .map((stat) => {
    const stat2 = pokemon2.stats.find((s) => s.stat_name === stat.stat_name);
    const diff = stat.base_stat - (stat2?.base_stat ?? 0);
    const diffStr = diff > 0 ? `+${diff}` : diff.toString();
    return `| ${stat.stat_name} | ${stat.base_stat} | ${stat2?.base_stat ?? 0} | ${diffStr} |`;
  })
  .join('\n')}

**Total Stats:** ${this.calculateStatsTotal(pokemon1.stats)} vs ${this.calculateStatsTotal(pokemon2.stats)}`;

    return {
      content: [
        {
          type: 'text',
          text: comparisonText,
        },
      ],
    };
  }

  formatSearchResults(results: PokemonSearchResults): ToolResponse {
    if (results.results.length === 0) {
      return this.formatError('No Pokemon found matching the criteria.');
    }

    const resultsText = `# Search Results (${results.totalCount} found)

${results.results
  .map((pokemon) => {
    const pokemonName = this.capitalizeName(pokemon.name);
    return `**${pokemonName}** (#${pokemon.id}) - Gen ${pokemon.generation}
  Types: ${pokemon.types.join(', ')}`;
  })
  .join('\n\n')}`;

    return {
      content: [
        {
          type: 'text',
          text: resultsText,
        },
      ],
    };
  }

  formatTypeEffectiveness(data: TypeEffectivenessData): ToolResponse {
    const typeName = this.capitalizeName(data.typeName);
    let result = `# ${typeName} Type Analysis\n\n`;

    if (data.includePokemon && data.pokemonList.length > 0) {
      result += `## Pokemon with ${typeName.toLowerCase()} type (showing first 20):\n\n`;
      result += data.pokemonList
        .map(
          (p) =>
            `- **${this.capitalizeName(p.name)}** (#${p.id}) - Gen ${p.generation}`
        )
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

  formatPokemonStats(pokemon: PokemonData): ToolResponse {
    const pokemonName = this.capitalizeName(pokemon.name);
    const totalStats = this.calculateStatsTotal(pokemon.stats);

    const statsText = `# ${pokemonName} - Detailed Stats

## Base Stats Breakdown
${pokemon.stats
  .map((stat) => {
    const percentage = Math.round((stat.base_stat / 255) * 100); // Max stat is typically 255
    const bar =
      '█'.repeat(Math.floor(percentage / 5)) +
      '░'.repeat(20 - Math.floor(percentage / 5));
    return `**${stat.stat_name.toUpperCase()}:** ${stat.base_stat}
${bar} (${percentage}%)
*EV Yield: ${stat.effort}*`;
  })
  .join('\n\n')}

## Summary
- **Total Base Stats:** ${totalStats}
- **Average Stat:** ${Math.round(totalStats / pokemon.stats.length)}
- **Highest Stat:** ${pokemon.stats.reduce((max, stat) => (stat.base_stat > max.base_stat ? stat : max)).stat_name} (${Math.max(...pokemon.stats.map((s) => s.base_stat))})
- **Lowest Stat:** ${pokemon.stats.reduce((min, stat) => (stat.base_stat < min.base_stat ? stat : min)).stat_name} (${Math.min(...pokemon.stats.map((s) => s.base_stat))})`;

    return {
      content: [
        {
          type: 'text',
          text: statsText,
        },
      ],
    };
  }

  formatStrongestPokemon(data: StrongestPokemonData): ToolResponse {
    if (data.results.length === 0) {
      return this.formatError(
        `No Pokemon found for criteria: ${data.criteria.criteria}`
      );
    }

    const criteriaFormatted = data.criteria.criteria.replace('_', ' ');

    const resultText = `# Strongest Pokemon by ${criteriaFormatted}

${data.results
  .map(
    (p, index) =>
      `${index + 1}. **${this.capitalizeName(p.name)}** (#${p.id}) - Gen ${p.generation}
   ${criteriaFormatted}: ${p.statValue}`
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

  formatError(message: string): ToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: `❌ **Error:** ${message}`,
        },
      ],
    };
  }

  formatNotFound(identifier: string): ToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: `Pokemon "${identifier}" not found.`,
        },
      ],
    };
  }
}
