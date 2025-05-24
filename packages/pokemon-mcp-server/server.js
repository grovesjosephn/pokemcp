#!/usr/bin/env node

/**
 * Pokemon MCP Server
 * Provides comprehensive Pokemon data through MCP protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

class PokemonMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'pokemon-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize database connection
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const dbPath = join(__dirname, 'pokemon.sqlite');
      this.db = new Database(dbPath, { readonly: true });
      console.error('✅ Connected to Pokemon database');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      process.exit(1);
    }

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_pokemon',
            description: 'Get detailed information about a specific Pokemon by name or ID',
            inputSchema: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: 'Pokemon name or ID number'
                }
              },
              required: ['identifier']
            }
          },
          {
            name: 'search_pokemon',
            description: 'Search Pokemon by various criteria (type, generation, stats)',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Pokemon type (e.g., fire, water, electric)'
                },
                generation: {
                  type: 'integer',
                  description: 'Pokemon generation (1-9)'
                },
                min_stat: {
                  type: 'integer',
                  description: 'Minimum base stat total'
                },
                limit: {
                  type: 'integer',
                  description: 'Maximum number of results (default: 20)',
                  default: 20
                }
              }
            }
          },
          {
            name: 'compare_pokemon',
            description: 'Compare stats and details between two Pokemon',
            inputSchema: {
              type: 'object',
              properties: {
                pokemon1: {
                  type: 'string',
                  description: 'First Pokemon name or ID'
                },
                pokemon2: {
                  type: 'string',
                  description: 'Second Pokemon name or ID'
                }
              },
              required: ['pokemon1', 'pokemon2']
            }
          },
          {
            name: 'get_type_effectiveness',
            description: 'Get type matchup information and Pokemon of specific types',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Pokemon type to analyze',
                  required: true
                },
                include_pokemon: {
                  type: 'boolean',
                  description: 'Include list of Pokemon with this type',
                  default: false
                }
              },
              required: ['type']
            }
          },
          {
            name: 'get_pokemon_stats',
            description: 'Get detailed stat breakdown for a Pokemon',
            inputSchema: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: 'Pokemon name or ID'
                }
              },
              required: ['identifier']
            }
          },
          {
            name: 'strongest_pokemon',
            description: 'Find strongest Pokemon by various criteria',
            inputSchema: {
              type: 'object',
              properties: {
                criteria: {
                  type: 'string',
                  enum: ['total_stats', 'attack', 'defense', 'hp', 'speed', 'sp_attack', 'sp_defense'],
                  description: 'Criteria for ranking Pokemon strength'
                },
                type: {
                  type: 'string',
                  description: 'Filter by Pokemon type (optional)'
                },
                generation: {
                  type: 'integer',
                  description: 'Filter by generation (optional)'
                },
                limit: {
                  type: 'integer',
                  description: 'Number of results (default: 10)',
                  default: 10
                }
              },
              required: ['criteria']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'get_pokemon':
            return await this.getPokemon(args.identifier);
          
          case 'search_pokemon':
            return await this.searchPokemon(args);
          
          case 'compare_pokemon':
            return await this.comparePokemon(args.pokemon1, args.pokemon2);
          
          case 'get_type_effectiveness':
            return await this.getTypeEffectiveness(args.type, args.include_pokemon);
          
          case 'get_pokemon_stats':
            return await this.getPokemonStats(args.identifier);
          
          case 'strongest_pokemon':
            return await this.getStrongestPokemon(args);
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    });
  }

  // Tool implementations
  async getPokemon(identifier) {
    const isNumeric = /^\d+$/.test(identifier);
    const query = isNumeric 
      ? 'SELECT * FROM pokemon WHERE id = ?'
      : 'SELECT * FROM pokemon WHERE LOWER(name) = LOWER(?)';
    
    const pokemon = this.db.prepare(query).get(identifier);
    
    if (!pokemon) {
      return {
        content: [{
          type: 'text',
          text: `Pokemon "${identifier}" not found.`
        }]
      };
    }

    // Get additional details
    const stats = this.db.prepare(`
      SELECT stat_name, base_stat, effort 
      FROM stats 
      WHERE pokemon_id = ?
    `).all(pokemon.id);

    const types = this.db.prepare(`
      SELECT t.name 
      FROM types t
      JOIN pokemon_types pt ON t.id = pt.type_id
      WHERE pt.pokemon_id = ?
      ORDER BY pt.slot
    `).all(pokemon.id);

    const abilities = this.db.prepare(`
      SELECT a.name, pa.is_hidden
      FROM abilities a
      JOIN pokemon_abilities pa ON a.id = pa.ability_id
      WHERE pa.pokemon_id = ?
      ORDER BY pa.slot
    `).all(pokemon.id);

    const totalStats = stats.reduce((sum, stat) => sum + stat.base_stat, 0);

    return {
      content: [{
        type: 'text',
        text: `# ${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} (#${pokemon.id})

**Basic Info:**
- Generation: ${pokemon.generation}
- Height: ${pokemon.height/10}m
- Weight: ${pokemon.weight/10}kg
- Base Experience: ${pokemon.base_experience}

**Types:** ${types.map(t => t.name).join(', ')}

**Abilities:** ${abilities.map(a => a.name + (a.is_hidden ? ' (Hidden)' : '')).join(', ')}

**Base Stats:**
${stats.map(s => `- ${s.stat_name}: ${s.base_stat}`).join('\n')}
- **Total: ${totalStats}**`
      }]
    };
  }

  async searchPokemon(args) {
    let query = `
      SELECT p.id, p.name, p.generation,
             GROUP_CONCAT(t.name) as types
      FROM pokemon p
      JOIN pokemon_types pt ON p.id = pt.pokemon_id
      JOIN types t ON pt.type_id = t.id
    `;
    
    const conditions = [];
    const params = [];

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

    const results = this.db.prepare(query).all(...params);

    if (results.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No Pokemon found matching the specified criteria.'
        }]
      };
    }

    const resultText = `# Search Results (${results.length} found)

${results.map(p => 
  `**${p.name.charAt(0).toUpperCase() + p.name.slice(1)}** (#${p.id}) - Gen ${p.generation}
  Types: ${p.types}`
).join('\n\n')}`;

    return {
      content: [{
        type: 'text',
        text: resultText
      }]
    };
  }

  async comparePokemon(identifier1, identifier2) {
    const pokemon1 = await this.getPokemonData(identifier1);
    const pokemon2 = await this.getPokemonData(identifier2);

    if (!pokemon1 || !pokemon2) {
      return {
        content: [{
          type: 'text',
          text: `One or both Pokemon not found: "${identifier1}", "${identifier2}"`
        }]
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
| Height | ${pokemon1.height/10}m | ${pokemon2.height/10}m |
| Weight | ${pokemon1.weight/10}kg | ${pokemon2.weight/10}kg |

## Stat Comparison

| Stat | ${pokemon1.name} | ${pokemon2.name} | Difference |
|------|${'-'.repeat(pokemon1.name.length)}|${'-'.repeat(pokemon2.name.length)}|------------|
${stats1.map(stat => {
  const stat2 = stats2.find(s => s.stat_name === stat.stat_name);
  const diff = stat.base_stat - stat2.base_stat;
  const diffStr = diff > 0 ? `+${diff}` : diff.toString();
  return `| ${stat.stat_name} | ${stat.base_stat} | ${stat2.base_stat} | ${diffStr} |`;
}).join('\n')}

**Total Stats:** ${stats1.reduce((sum, s) => sum + s.base_stat, 0)} vs ${stats2.reduce((sum, s) => sum + s.base_stat, 0)}`;

    return {
      content: [{
        type: 'text',
        text: comparison
      }]
    };
  }

  async getTypeEffectiveness(type, includePokemon = false) {
    // Check if type exists
    const typeExists = this.db.prepare('SELECT id FROM types WHERE LOWER(name) = LOWER(?)').get(type);
    
    if (!typeExists) {
      return {
        content: [{
          type: 'text',
          text: `Type "${type}" not found.`
        }]
      };
    }

    let result = `# ${type.charAt(0).toUpperCase() + type.slice(1)} Type Analysis\n\n`;

    if (includePokemon) {
      const pokemon = this.db.prepare(`
        SELECT p.name, p.id, p.generation
        FROM pokemon p
        JOIN pokemon_types pt ON p.id = pt.pokemon_id
        JOIN types t ON pt.type_id = t.id
        WHERE LOWER(t.name) = LOWER(?)
        ORDER BY p.id
        LIMIT 20
      `).all(type);

      result += `## Pokemon with ${type} type (showing first 20):\n\n`;
      result += pokemon.map(p => `- **${p.name}** (#${p.id}) - Gen ${p.generation}`).join('\n');
    }

    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }

  async getPokemonStats(identifier) {
    const pokemon = await this.getPokemonData(identifier);
    
    if (!pokemon) {
      return {
        content: [{
          type: 'text',
          text: `Pokemon "${identifier}" not found.`
        }]
      };
    }

    const stats = this.getPokemonStatsData(pokemon.id);
    const totalStats = stats.reduce((sum, stat) => sum + stat.base_stat, 0);

    const statsText = `# ${pokemon.name} - Detailed Stats

## Base Stats
${stats.map(s => `**${s.stat_name}:** ${s.base_stat} (EV: ${s.effort})`).join('\n')}

**Total Base Stats:** ${totalStats}

## Stat Distribution
${stats.map(s => {
  const percentage = ((s.base_stat / totalStats) * 100).toFixed(1);
  return `- ${s.stat_name}: ${percentage}% of total stats`;
}).join('\n')}`;

    return {
      content: [{
        type: 'text',
        text: statsText
      }]
    };
  }

  async getStrongestPokemon(args) {
    const { criteria, type, generation, limit = 10 } = args;
    
    let statColumn;
    switch (criteria) {
      case 'total_stats':
        statColumn = 'SUM(s.base_stat)';
        break;
      case 'attack':
        statColumn = 's.base_stat';
        break;
      case 'defense':
        statColumn = 's.base_stat';
        break;
      case 'hp':
        statColumn = 's.base_stat';
        break;
      case 'speed':
        statColumn = 's.base_stat';
        break;
      case 'sp_attack':
        statColumn = 's.base_stat';
        break;
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

    const conditions = [];
    const params = [];

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

    const results = this.db.prepare(query).all(...params);

    const resultText = `# Strongest Pokemon by ${criteria.replace('_', ' ')}

${results.map((p, index) => 
  `${index + 1}. **${p.name}** (#${p.id}) - Gen ${p.generation}
   ${criteria.replace('_', ' ')}: ${p.stat_value}`
).join('\n\n')}`;

    return {
      content: [{
        type: 'text',
        text: resultText
      }]
    };
  }

  // Helper methods
  getPokemonData(identifier) {
    const isNumeric = /^\d+$/.test(identifier);
    const query = isNumeric 
      ? 'SELECT * FROM pokemon WHERE id = ?'
      : 'SELECT * FROM pokemon WHERE LOWER(name) = LOWER(?)';
    
    return this.db.prepare(query).get(identifier);
  }

  getPokemonStatsData(pokemonId) {
    return this.db.prepare(`
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
    `).all(pokemonId);
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      console.error('\n🛑 Shutting down Pokemon MCP Server...');
      if (this.db) {
        this.db.close();
      }
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 Pokemon MCP Server running on stdio');
  }
}

// Start the server
const server = new PokemonMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});