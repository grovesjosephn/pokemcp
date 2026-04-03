#!/usr/bin/env node

/**
 * Pokemon MCP Server
 * Provides comprehensive Pokemon data through MCP protocol
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Database } from "bun:sqlite";
import path from "path";
import { promises as fs } from "fs";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { z } from "zod";

// Import extracted tool classes
import { GetPokemonTool } from "./src/tools/getPokemon.js";
import { SearchPokemonTool } from "./src/tools/searchPokemon.js";
import { ComparePokemonTool } from "./src/tools/comparePokemon.js";
import { GetTypeEffectivenessTool } from "./src/tools/getTypeEffectiveness.js";
import { GetPokemonStatsTool } from "./src/tools/getPokemonStats.js";
import { StrongestPokemonTool } from "./src/tools/strongestPokemon.js";
import { MarkdownFormatter } from "./src/formatters/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PokemonMCPServer {
  private server: McpServer;
  private db: Database;

  // Tool instances
  private getPokemonTool: GetPokemonTool;
  private searchPokemonTool: SearchPokemonTool;
  private comparePokemonTool: ComparePokemonTool;
  private getTypeEffectivenessTool: GetTypeEffectivenessTool;
  private getPokemonStatsTool: GetPokemonStatsTool;
  private strongestPokemonTool: StrongestPokemonTool;

  constructor() {
    const dataDir =
      process.env.POKEMON_DATA_DIR ||
      path.resolve(__dirname, "../../data") ||
      path.resolve(process.cwd(), "../../data");

    fs.mkdir(dataDir, { recursive: true }).catch(console.error);

    const dbPath = path.join(dataDir, "pokemon.sqlite");
    console.error(`📁 Using database path: ${dbPath}`);

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

    this.server = new McpServer({
      name: "pokemon-server",
      version: "1.0.0",
    });

    const formatter = new MarkdownFormatter();
    this.getPokemonTool = new GetPokemonTool(this.db, formatter);
    this.searchPokemonTool = new SearchPokemonTool(this.db, formatter);
    this.comparePokemonTool = new ComparePokemonTool(this.db, formatter);
    this.getTypeEffectivenessTool = new GetTypeEffectivenessTool(this.db, formatter);
    this.getPokemonStatsTool = new GetPokemonStatsTool(this.db, formatter);
    this.strongestPokemonTool = new StrongestPokemonTool(this.db, formatter);

    this.setupTools();
    this.setupErrorHandling();
  }

  private setupTools(): void {
    this.server.registerTool(
      "get_pokemon",
      {
        title: "Get Pokemon",
        description: "Get detailed information about a specific Pokemon by name or ID",
        inputSchema: {
          identifier: z.string().describe("Pokemon name or ID number"),
        },
      },
      async ({ identifier }) => {
        return await this.getPokemonTool.execute(identifier);
      },
    );

    this.server.registerTool(
      "search_pokemon",
      {
        title: "Search Pokemon",
        description: "Search Pokemon by various criteria (type, generation, stats)",
        inputSchema: {
          type: z.string().optional().describe("Pokemon type (e.g., fire, water, electric)"),
          generation: z.number().int().optional().describe("Pokemon generation (1-9)"),
          min_stat: z.number().int().optional().describe("Minimum base stat total"),
          limit: z
            .number()
            .int()
            .optional()
            .default(20)
            .describe("Maximum number of results (default: 20)"),
        },
      },
      async (args) => {
        return await this.searchPokemonTool.execute(args);
      },
    );

    this.server.registerTool(
      "compare_pokemon",
      {
        title: "Compare Pokemon",
        description: "Compare stats and details between two Pokemon",
        inputSchema: {
          pokemon1: z.string().describe("First Pokemon name or ID"),
          pokemon2: z.string().describe("Second Pokemon name or ID"),
        },
      },
      async ({ pokemon1, pokemon2 }) => {
        return await this.comparePokemonTool.execute(pokemon1, pokemon2);
      },
    );

    this.server.registerTool(
      "get_type_effectiveness",
      {
        title: "Get Type Effectiveness",
        description: "Get type matchup information and Pokemon of specific types",
        inputSchema: {
          type: z.string().describe("Pokemon type to analyze"),
          include_pokemon: z
            .boolean()
            .optional()
            .default(false)
            .describe("Include list of Pokemon with this type"),
        },
      },
      async ({ type, include_pokemon }) => {
        return await this.getTypeEffectivenessTool.execute(type, include_pokemon ?? false);
      },
    );

    this.server.registerTool(
      "get_pokemon_stats",
      {
        title: "Get Pokemon Stats",
        description: "Get detailed stat breakdown for a Pokemon",
        inputSchema: {
          identifier: z.string().describe("Pokemon name or ID"),
        },
      },
      async ({ identifier }) => {
        return await this.getPokemonStatsTool.execute(identifier);
      },
    );

    this.server.registerTool(
      "strongest_pokemon",
      {
        title: "Strongest Pokemon",
        description: "Find strongest Pokemon by various criteria",
        inputSchema: {
          criteria: z
            .enum(["total_stats", "attack", "defense", "hp", "speed", "sp_attack", "sp_defense"])
            .describe("Criteria for ranking Pokemon strength"),
          type: z.string().optional().describe("Filter by Pokemon type (optional)"),
          generation: z.number().int().optional().describe("Filter by generation (optional)"),
          limit: z
            .number()
            .int()
            .optional()
            .default(10)
            .describe("Number of results (default: 10)"),
        },
      },
      async (args) => {
        return await this.strongestPokemonTool.execute(args);
      },
    );
  }

  private setupErrorHandling(): void {
    this.server.server.onerror = (error: Error) => {
      console.error("❌ Server error:", error.message);
      console.error("Stack:", error.stack);
    };

    process.on("SIGINT", async () => {
      console.error("\n🛑 Shutting down Pokemon MCP Server...");
      if (this.db) {
        this.db.close();
      }
      await this.server.close();
      process.exit(0);
    });

    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught exception:", error.message);
      console.error("Stack:", error.stack);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason) => {
      console.error("❌ Unhandled rejection:", reason);
      process.exit(1);
    });
  }

  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("🚀 Pokemon MCP Server running on stdio");
  }
}

const server = new PokemonMCPServer();
server.run().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
