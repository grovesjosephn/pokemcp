# Pokemon MCP Server

A production-ready Model Context Protocol (MCP) server that provides Pokemon data through standardized tools. This monorepo contains both the MCP server and data ingestion service for fetching Pokemon data from PokeAPI.

## Architecture

This is a PNPM monorepo with two main packages, built with modern TypeScript architecture:

- **pokemon-mcp-server**: High-performance MCP server with modular architecture, centralized query management, and flexible response formatting
- **pokemon-mcp-ingestion**: Data ingestion service that fetches from PokeAPI and stores in SQLite

### Key Architectural Features

- ✅ **Modular Tool Architecture** - 6 extracted tool classes with dependency injection
- ✅ **Centralized Query Management** - 5 specialized database modules with prepared statement caching
- ✅ **Response Formatter Pattern** - Support for multiple output formats (Markdown, JSON)
- ✅ **Performance Optimized** - 75% query reduction through optimized database operations
- ✅ **Production-Ready Testing** - 77/77 tests passing with comprehensive coverage

The system uses a shared SQLite database (`data/pokemon.sqlite`) for Pokemon data storage.

## Features

### MCP Tools Available

- `get_pokemon` - Get detailed information about a specific Pokemon (optimized single-query performance)
- `search_pokemon` - Search Pokemon by name, type, or other criteria (dynamic query building)
- `get_strongest_pokemon` - Find the strongest Pokemon by various stats (aggregated rankings)
- `get_pokemon_stats` - Get detailed stats for a Pokemon (comprehensive stat analysis)
- `compare_pokemon` - Compare stats between two Pokemon (side-by-side comparison)
- `get_type_effectiveness` - Get type effectiveness information (type relationships)

### Data Coverage & Performance

- **Complete Pokemon data** from PokeAPI with optimized joins
- **Stats, types, abilities** and comprehensive relationships
- **Type effectiveness** with fast lookups
- **Searchable by multiple criteria** with dynamic query construction
- **Prepared statement caching** for optimal performance
- **Flexible output formats** - Markdown (rich text) and JSON (structured data)

## Quick Start

### Prerequisites

- Node.js 18+
- PNPM
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/grovesjosephn/pokemcp.git
cd pokemcp
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up the database:

```bash
./scripts/setup.sh
```

4. Build all packages:

```bash
pnpm build
```

### Usage

#### Running the MCP Server

```bash
# Development mode (with hot reload)
pnpm dev

# Production mode
cd packages/pokemon-mcp-server
pnpm start
```

#### Testing with MCP Inspector

```bash
# Visual GUI testing
cd packages/pokemon-mcp-server
pnpm inspect

# CLI testing
pnpm inspect:cli
```

#### Data Ingestion

```bash
# Run data ingestion
cd packages/pokemon-mcp-ingestion
pnpm start
```

## Claude Desktop Integration

### Option 1: NPM Package (Recommended)

Install the server globally:

```bash
cd packages/pokemon-mcp-server
pnpm build
npm link
```

Configure Claude Desktop:

```json
{
  "mcpServers": {
    "pokemon": {
      "command": "pokemon-mcp-server",
      "env": {
        "POKEMON_DATA_DIR": "/path/to/pokemcp/data"
      }
    }
  }
}
```

### Option 2: Direct Node Execution

```json
{
  "mcpServers": {
    "pokemon": {
      "command": "node",
      "args": ["/path/to/pokemcp/packages/pokemon-mcp-server/dist/server.js"],
      "env": {
        "POKEMON_DATA_DIR": "/path/to/pokemcp/data"
      }
    }
  }
}
```

### Option 3: Development Mode

```json
{
  "mcpServers": {
    "pokemon": {
      "command": "pnpm",
      "args": ["--filter", "pokemon-mcp-server", "start"],
      "cwd": "/path/to/pokemcp",
      "env": {
        "POKEMON_DATA_DIR": "/path/to/pokemcp/data"
      }
    }
  }
}
```

## Development

### Workspace Commands

```bash
pnpm build         # Build all packages
pnpm dev           # Run all packages in development mode
pnpm test          # Run tests for all packages
pnpm lint          # Lint all packages
pnpm format        # Format all files
pnpm format:check  # Check formatting
```

### Server Package Commands

```bash
cd packages/pokemon-mcp-server

pnpm build         # Compile TypeScript
pnpm dev           # Watch mode with tsx
pnpm start         # Run server
pnpm inspect       # Run MCP Inspector GUI
pnpm inspect:cli   # Run MCP Inspector CLI
pnpm test          # Run tests
```

### Ingestion Package Commands

```bash
cd packages/pokemon-mcp-ingestion

pnpm build         # Compile TypeScript
pnpm dev           # Watch mode
pnpm start         # Run ingestion
pnpm test          # Run tests
```

## Testing

The project uses Vitest for testing:

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter pokemon-mcp-server test
pnpm --filter pokemon-mcp-ingestion test
```

## Database Schema

The SQLite database includes optimized tables for:

- `pokemon` - Basic Pokemon information with indexed lookups
- `stats` - Pokemon stats (HP, Attack, Defense, etc.) with stat aggregations
- `pokemon_types` / `types` - Pokemon type relationships with fast filtering
- `pokemon_abilities` / `abilities` - Pokemon abilities with hidden ability support
- `type_effectiveness` - Type effectiveness relationships (future enhancement)

### Query Architecture

- **Centralized Query Management** - 5 specialized modules (Pokemon, Stats, Types, Abilities, Search)
- **BaseQueryModule Pattern** - Consistent prepared statement management across all modules
- **Dynamic Query Building** - Complex search and ranking queries built dynamically
- **Optimized Joins** - Single-query data retrieval replacing multiple round trips

## Recent Improvements

This server has undergone comprehensive modernization with multiple phases of improvements:

### ✅ Phase 1: Modular Architecture

- Extracted 6 tool classes from monolithic server.ts (850+ → 408 lines)
- Implemented dependency injection pattern
- Added comprehensive test infrastructure with 77/77 tests passing
- **Pull Requests**: [#1](https://github.com/grovesjosephn/pokemcp/pull/1), [#2](https://github.com/grovesjosephn/pokemcp/pull/2)

### ✅ Phase 2.1: Response Formatter Pattern

- Separated data retrieval from presentation logic
- Added support for multiple output formats (Markdown, JSON)
- Clean separation of concerns with extensible formatter architecture
- **Pull Request**: [#3](https://github.com/grovesjosephn/pokemcp/pull/3)

### ✅ Phase 2.2: Centralized Query Management

- Created 5 specialized database query modules
- Implemented BaseQueryModule pattern with prepared statement caching
- Added dynamic query building for complex searches and rankings
- Achieved complete separation of SQL logic from business logic
- **Pull Request**: [#4](https://github.com/grovesjosephn/pokemcp/pull/4)

### 📊 Performance Results

- **75% database query reduction** (4 queries → 1 optimized query for getPokemon)
- **Prepared statement caching** across all database operations
- **Modular architecture** with clear separation of concerns
- **Production-ready** with comprehensive test coverage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `pnpm format` and `pnpm lint`
6. Submit a pull request

### Commit Guidelines

Use conventional commit format:

```
<type>[optional scope]: <description>

Examples:
- feat(server): add Pokemon evolution chain tool
- fix(ingestion): handle missing species URL gracefully
- docs: update integration guide
```

## License

MIT License - see LICENSE file for details

## Links

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [PokeAPI](https://pokeapi.co/)
- [Claude Desktop](https://claude.ai/desktop)
