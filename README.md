# Pokemon MCP Server

A Model Context Protocol (MCP) server that provides Pokemon data through standardized tools. This monorepo contains both the MCP server and data ingestion service for fetching Pokemon data from PokeAPI.

## Architecture

This is a PNPM monorepo with two main packages:

- **pokemon-mcp-server**: MCP server that exposes Pokemon data through standardized tools
- **pokemon-mcp-ingestion**: Data ingestion service that fetches from PokeAPI and stores in SQLite

The system uses a shared SQLite database (`data/pokemon.sqlite`) for Pokemon data storage.

## Features

### MCP Tools Available

- `get_pokemon` - Get detailed information about a specific Pokemon
- `search_pokemon` - Search Pokemon by name, type, or other criteria
- `get_strongest_pokemon` - Find the strongest Pokemon by various stats
- `get_pokemon_stats` - Get detailed stats for a Pokemon
- `compare_pokemon` - Compare stats between two Pokemon
- `get_type_effectiveness` - Get type effectiveness information

### Data Coverage

- Complete Pokemon data from PokeAPI
- Stats, types, abilities, and more
- Type effectiveness relationships
- Searchable by multiple criteria

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
bun install
```

3. Set up the database:

```bash
./scripts/setup.sh
```

4. Build all packages:

```bash
bun run build
```

### Usage

#### Running the MCP Server

```bash
# Development mode (with hot reload)
bun run dev

# Production mode
cd packages/pokemon-mcp-server
bun run start
```

#### Testing with MCP Inspector

```bash
# Visual GUI testing
cd packages/pokemon-mcp-server
bun run inspect

# CLI testing
bun run inspect:cli
```

#### Data Ingestion

```bash
# Run data ingestion
cd packages/pokemon-mcp-ingestion
bun run start
```

## Claude Desktop Integration

### Option 1: NPM Package (Recommended)

Install the server globally:

```bash
cd packages/pokemon-mcp-server
bun run build
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
      "command": "bun",
      "args": ["/path/to/pokemcp/packages/pokemon-mcp-server/server.ts"],
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
bun run build         # Build all packages
bun run dev           # Run all packages in development mode
bun run test          # Run tests for all packages
bun run format        # Format all files
bun run format:check  # Check formatting
```

### Server Package Commands

```bash
cd packages/pokemon-mcp-server

bun run build         # Compile TypeScript
bun run dev           # Watch mode
bun run start         # Run server
bun run inspect       # Run MCP Inspector GUI
bun run inspect:cli   # Run MCP Inspector CLI
bun test              # Run tests
```

### Ingestion Package Commands

```bash
cd packages/pokemon-mcp-ingestion

bun run build         # Compile TypeScript
bun run dev           # Watch mode
bun run start         # Run ingestion
bun test              # Run tests
```

## Testing

The project uses bun's built-in test runner:

```bash
# Run all tests
bun run test

# Run specific package tests
cd packages/pokemon-mcp-server && bun test
cd packages/pokemon-mcp-ingestion && bun test
```

## Database Schema

The SQLite database includes tables for:

- `pokemon` - Basic Pokemon information
- `stats` - Pokemon stats (HP, Attack, Defense, etc.)
- `types` - Pokemon types and relationships
- `abilities` - Pokemon abilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `bun run format`
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
