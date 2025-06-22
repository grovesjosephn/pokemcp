import {
  ResponseFormatter,
  PokemonData,
  PokemonComparisonData,
  PokemonSearchResults,
  TypeEffectivenessData,
} from './base.js';
import { ToolResponse } from '../types/index.js';

/**
 * JSON formatter - provides structured data output
 * Useful for programmatic consumption or when structured data is preferred
 */
export class JsonFormatter extends ResponseFormatter {
  formatPokemon(pokemon: PokemonData): ToolResponse {
    const totalStats = this.calculateStatsTotal(pokemon.stats);

    const structuredData = {
      id: pokemon.id,
      name: this.capitalizeName(pokemon.name),
      basic_info: {
        generation: pokemon.generation,
        height_meters: pokemon.height / 10,
        weight_kg: pokemon.weight / 10,
        base_experience: pokemon.base_experience,
      },
      types: pokemon.types.map((t) => t.name),
      abilities: pokemon.abilities.map((a) => ({
        name: a.name,
        is_hidden: a.is_hidden,
        slot: a.slot,
      })),
      stats: {
        individual: pokemon.stats.reduce(
          (acc, stat) => {
            acc[stat.stat_name] = {
              base_stat: stat.base_stat,
              effort: stat.effort,
            };
            return acc;
          },
          {} as Record<string, { base_stat: number; effort: number }>
        ),
        total: totalStats,
        average: Math.round(totalStats / pokemon.stats.length),
      },
      urls: {
        species: pokemon.species_url,
        sprite: pokemon.sprite_url,
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `# ${this.capitalizeName(pokemon.name)} Data\n\n\`\`\`json\n${JSON.stringify(structuredData, null, 2)}\n\`\`\``,
        },
      ],
    };
  }

  formatComparison(comparison: PokemonComparisonData): ToolResponse {
    const { pokemon1, pokemon2 } = comparison;

    const comparisonData = {
      comparison: {
        pokemon1: {
          id: pokemon1.id,
          name: this.capitalizeName(pokemon1.name),
          generation: pokemon1.generation,
          height_meters: pokemon1.height / 10,
          weight_kg: pokemon1.weight / 10,
          total_stats: this.calculateStatsTotal(pokemon1.stats),
        },
        pokemon2: {
          id: pokemon2.id,
          name: this.capitalizeName(pokemon2.name),
          generation: pokemon2.generation,
          height_meters: pokemon2.height / 10,
          weight_kg: pokemon2.weight / 10,
          total_stats: this.calculateStatsTotal(pokemon2.stats),
        },
        stat_differences: pokemon1.stats.map((stat) => {
          const stat2 = pokemon2.stats.find(
            (s) => s.stat_name === stat.stat_name
          );
          return {
            stat_name: stat.stat_name,
            pokemon1_value: stat.base_stat,
            pokemon2_value: stat2?.base_stat || 0,
            difference: stat.base_stat - (stat2?.base_stat || 0),
          };
        }),
        summary: {
          stronger_pokemon:
            this.calculateStatsTotal(pokemon1.stats) >
            this.calculateStatsTotal(pokemon2.stats)
              ? this.capitalizeName(pokemon1.name)
              : this.capitalizeName(pokemon2.name),
          total_stats_difference:
            this.calculateStatsTotal(pokemon1.stats) -
            this.calculateStatsTotal(pokemon2.stats),
        },
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `# Pokemon Comparison Data\n\n\`\`\`json\n${JSON.stringify(comparisonData, null, 2)}\n\`\`\``,
        },
      ],
    };
  }

  formatSearchResults(results: PokemonSearchResults): ToolResponse {
    if (results.results.length === 0) {
      return this.formatError('No Pokemon found matching the criteria.');
    }

    const searchData = {
      search_results: {
        total_found: results.totalCount,
        criteria: results.criteria,
        results: results.results.map((pokemon) => ({
          id: pokemon.id,
          name: this.capitalizeName(pokemon.name),
          generation: pokemon.generation,
          types: pokemon.types,
        })),
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `# Pokemon Search Results\n\n\`\`\`json\n${JSON.stringify(searchData, null, 2)}\n\`\`\``,
        },
      ],
    };
  }

  formatTypeEffectiveness(data: TypeEffectivenessData): ToolResponse {
    const effectivenessData = {
      type_analysis: {
        type: this.capitalizeName(data.typeName),
        include_pokemon: data.includePokemon,
        pokemon_with_type: data.pokemonList.map((pokemon) => ({
          id: pokemon.id,
          name: this.capitalizeName(pokemon.name),
          generation: pokemon.generation,
        })),
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `# ${this.capitalizeName(data.type)} Type Effectiveness Data\n\n\`\`\`json\n${JSON.stringify(effectivenessData, null, 2)}\n\`\`\``,
        },
      ],
    };
  }

  formatPokemonStats(pokemon: PokemonData): ToolResponse {
    const totalStats = this.calculateStatsTotal(pokemon.stats);
    const statsArray = pokemon.stats.map((s) => s.base_stat);

    const statsData = {
      pokemon_stats: {
        pokemon: {
          id: pokemon.id,
          name: this.capitalizeName(pokemon.name),
        },
        stats: {
          individual: pokemon.stats.reduce(
            (acc, stat) => {
              acc[stat.stat_name] = {
                base_stat: stat.base_stat,
                effort_value_yield: stat.effort,
                percentage_of_max: Math.round((stat.base_stat / 255) * 100), // Assuming 255 is max
              };
              return acc;
            },
            {} as Record<string, any>
          ),
          summary: {
            total: totalStats,
            average: Math.round(totalStats / pokemon.stats.length),
            highest: {
              stat: pokemon.stats.reduce((max, stat) =>
                stat.base_stat > max.base_stat ? stat : max
              ).stat_name,
              value: Math.max(...statsArray),
            },
            lowest: {
              stat: pokemon.stats.reduce((min, stat) =>
                stat.base_stat < min.base_stat ? stat : min
              ).stat_name,
              value: Math.min(...statsArray),
            },
          },
        },
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `# ${this.capitalizeName(pokemon.name)} Stats Data\n\n\`\`\`json\n${JSON.stringify(statsData, null, 2)}\n\`\`\``,
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

    const strongestData = {
      strongest_pokemon: {
        criteria: data.criteria.criteria.replace('_', ' ').toUpperCase(),
        results: data.results.map((pokemon, index) => ({
          rank: index + 1,
          pokemon: {
            id: pokemon.id,
            name: this.capitalizeName(pokemon.name),
            generation: pokemon.generation,
          },
          criteria_value: pokemon.statValue,
        })),
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `# Strongest Pokemon by ${data.criteria.criteria.replace('_', ' ').toUpperCase()}\n\n\`\`\`json\n${JSON.stringify(strongestData, null, 2)}\n\`\`\``,
        },
      ],
    };
  }

  formatError(message: string): ToolResponse {
    const errorData = {
      error: {
        message: message,
        timestamp: new Date().toISOString(),
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `# Error\n\n\`\`\`json\n${JSON.stringify(errorData, null, 2)}\n\`\`\``,
        },
      ],
    };
  }

  formatNotFound(identifier: string): ToolResponse {
    const notFoundData = {
      not_found: {
        searched_for: identifier,
        message: `Pokemon "${identifier}" not found.`,
        timestamp: new Date().toISOString(),
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `# Pokemon Not Found\n\n\`\`\`json\n${JSON.stringify(notFoundData, null, 2)}\n\`\`\``,
        },
      ],
    };
  }
}
