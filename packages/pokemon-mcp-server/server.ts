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
  CallToolResult,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import path from 'path';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

// Import extracted tool classes
import { GetPokemonTool } from './src/tools/getPokemon.js';
import { SearchPokemonTool } from './src/tools/searchPokemon.js';
import { ComparePokemonTool } from './src/tools/comparePokemon.js';
import { GetTypeEffectivenessTool } from './src/tools/getTypeEffectiveness.js';
import { GetPokemonStatsTool } from './src/tools/getPokemonStats.js';
import { StrongestPokemonTool } from './src/tools/strongestPokemon.js';
import { MarkdownFormatter } from './src/formatters/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import types
import { SearchArgs, StrongestArgs } from './src/types/index.js';

class PokemonMCPServer {
  private server: Server;
  private db: Database.Database;

  // Tool instances
  private getPokemonTool: GetPokemonTool;
  private searchPokemonTool: SearchPokemonTool;
  private comparePokemonTool: ComparePokemonTool;
  private getTypeEffectivenessTool: GetTypeEffectivenessTool;
  private getPokemonStatsTool: GetPokemonStatsTool;
  private strongestPokemonTool: StrongestPokemonTool;

  constructor() {
    // Ensure data directory exists - handle both local dev and Claude Desktop paths
    const dataDir =
      process.env.POKEMON_DATA_DIR ||
      path.resolve(__dirname, '../../data') ||
      path.resolve(process.cwd(), '../../data');

    // Ensure directory exists
    fs.mkdir(dataDir, { recursive: true }).catch(console.error);

    const dbPath = path.join(dataDir, 'pokemon.sqlite');
    console.error(`📁 Using database path: ${dbPath}`);

    // Check if database file exists
    try {
      if (!existsSync(dbPath)) {
        console.error(`❌ Database file not found at: ${dbPath}`);
        console.error(`💡 Make sure to run: ./scripts/setup-local-dev.sh`);
        process.exit(1);
      }
      this.db = new Database(dbPath);
      console.error(`✅ Database connected successfully`);
    } catch (error) {
      console.error(`❌ Database connection failed:`, error);
      process.exit(1);
    }

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

    // Initialize tool instances with shared formatter
    const formatter = new MarkdownFormatter();
    this.getPokemonTool = new GetPokemonTool(this.db, formatter);
    this.searchPokemonTool = new SearchPokemonTool(this.db, formatter);
    this.comparePokemonTool = new ComparePokemonTool(this.db, formatter);
    this.getTypeEffectivenessTool = new GetTypeEffectivenessTool(
      this.db,
      formatter
    );
    this.getPokemonStatsTool = new GetPokemonStatsTool(this.db, formatter);
    this.strongestPokemonTool = new StrongestPokemonTool(this.db, formatter);

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_pokemon',
            description:
              'Get detailed information about a specific Pokemon by name or ID',
            inputSchema: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: 'Pokemon name or ID number',
                },
              },
              required: ['identifier'],
            },
          },
          {
            name: 'search_pokemon',
            description:
              'Search Pokemon by various criteria (type, generation, stats)',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Pokemon type (e.g., fire, water, electric)',
                },
                generation: {
                  type: 'integer',
                  description: 'Pokemon generation (1-9)',
                },
                min_stat: {
                  type: 'integer',
                  description: 'Minimum base stat total',
                },
                limit: {
                  type: 'integer',
                  description: 'Maximum number of results (default: 20)',
                  default: 20,
                },
              },
            },
          },
          {
            name: 'compare_pokemon',
            description: 'Compare stats and details between two Pokemon',
            inputSchema: {
              type: 'object',
              properties: {
                pokemon1: {
                  type: 'string',
                  description: 'First Pokemon name or ID',
                },
                pokemon2: {
                  type: 'string',
                  description: 'Second Pokemon name or ID',
                },
              },
              required: ['pokemon1', 'pokemon2'],
            },
          },
          {
            name: 'get_type_effectiveness',
            description:
              'Get type matchup information and Pokemon of specific types',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Pokemon type to analyze',
                  required: true,
                },
                include_pokemon: {
                  type: 'boolean',
                  description: 'Include list of Pokemon with this type',
                  default: false,
                },
              },
              required: ['type'],
            },
          },
          {
            name: 'get_pokemon_stats',
            description: 'Get detailed stat breakdown for a Pokemon',
            inputSchema: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: 'Pokemon name or ID',
                },
              },
              required: ['identifier'],
            },
          },
          {
            name: 'strongest_pokemon',
            description: 'Find strongest Pokemon by various criteria',
            inputSchema: {
              type: 'object',
              properties: {
                criteria: {
                  type: 'string',
                  enum: [
                    'total_stats',
                    'attack',
                    'defense',
                    'hp',
                    'speed',
                    'sp_attack',
                    'sp_defense',
                  ],
                  description: 'Criteria for ranking Pokemon strength',
                },
                type: {
                  type: 'string',
                  description: 'Filter by Pokemon type (optional)',
                },
                generation: {
                  type: 'integer',
                  description: 'Filter by generation (optional)',
                },
                limit: {
                  type: 'integer',
                  description: 'Number of results (default: 10)',
                  default: 10,
                },
              },
              required: ['criteria'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        if (!args) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
        }

        switch (name) {
          case 'get_pokemon': {
            if (typeof args.identifier !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid identifier');
            }
            return await this.getPokemonTool.execute(args.identifier);
          }

          case 'search_pokemon': {
            if (!this.isSearchArgs(args)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid search arguments'
              );
            }
            return await this.searchPokemonTool.execute(args);
          }

          case 'compare_pokemon': {
            if (
              typeof args.pokemon1 !== 'string' ||
              typeof args.pokemon2 !== 'string'
            ) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid Pokemon identifiers'
              );
            }
            return await this.comparePokemonTool.execute(
              args.pokemon1,
              args.pokemon2
            );
          }

          case 'get_type_effectiveness': {
            if (typeof args.type !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid type');
            }
            const includePokemon =
              args.include_pokemon === undefined
                ? false
                : Boolean(args.include_pokemon);
            return await this.getTypeEffectivenessTool.execute(
              args.type,
              includePokemon
            );
          }

          case 'get_pokemon_stats': {
            if (typeof args.identifier !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid identifier');
            }
            return await this.getPokemonStatsTool.execute(args.identifier);
          }

          case 'strongest_pokemon': {
            if (!this.isStrongestArgs(args)) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Invalid strongest arguments'
              );
            }
            return await this.strongestPokemonTool.execute(args);
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private isSearchArgs(args: unknown): args is SearchArgs {
    if (!args || typeof args !== 'object') return false;
    const searchArgs = args as SearchArgs;
    return (
      (searchArgs.type === undefined || typeof searchArgs.type === 'string') &&
      (searchArgs.generation === undefined ||
        typeof searchArgs.generation === 'number') &&
      (searchArgs.min_stat === undefined ||
        typeof searchArgs.min_stat === 'number') &&
      (searchArgs.limit === undefined || typeof searchArgs.limit === 'number')
    );
  }

  private isStrongestArgs(args: unknown): args is StrongestArgs {
    if (!args || typeof args !== 'object') return false;
    const strongestArgs = args as StrongestArgs;
    return (
      typeof strongestArgs.criteria === 'string' &&
      [
        'total_stats',
        'attack',
        'defense',
        'hp',
        'speed',
        'sp_attack',
        'sp_defense',
      ].includes(strongestArgs.criteria) &&
      (strongestArgs.type === undefined ||
        typeof strongestArgs.type === 'string') &&
      (strongestArgs.generation === undefined ||
        typeof strongestArgs.generation === 'number') &&
      (strongestArgs.limit === undefined ||
        typeof strongestArgs.limit === 'number')
    );
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error: Error) => {
      console.error('❌ Server error:', error.message);
      console.error('Stack:', error.stack);
    };

    process.on('SIGINT', async () => {
      console.error('\n🛑 Shutting down Pokemon MCP Server...');
      if (this.db) {
        this.db.close();
      }
      await this.server.close();
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught exception:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('❌ Unhandled rejection:', reason);
      process.exit(1);
    });
  }

  public async run(): Promise<void> {
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
