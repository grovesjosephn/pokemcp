# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

This is a Bun monorepo for a Pokemon MCP (Model Context Protocol) system with two main packages:

- **pokemon-mcp-server**: MCP server that provides Pokemon data through standardized tools
- **pokemon-mcp-ingestion**: Data ingestion service that fetches from PokeAPI and stores in SQLite

The system uses a shared SQLite database (`data/pokemon.sqlite`) for Pokemon data storage. The MCP server exposes tools for getting individual Pokemon, searching by criteria, and finding strongest Pokemon by various stats.

## Commands

### Workspace Commands (run from root)

```bash
bun run build         # Build all packages
bun run dev           # Run all packages in development mode
bun run test          # Run tests for all packages (single run)
bun run test:watch    # Run tests in watch mode
bun run test:run      # Run tests for all packages (single run)
bun run format        # Format all files with oxfmt
bun run format:check  # Check formatting without modifying files
```

### Server Package Commands (packages/pokemon-mcp-server/)

```bash
bun run build         # Compile TypeScript
bun run dev           # Watch mode with bun --watch
bun run start         # Run server directly
bun run inspect       # Run MCP Inspector GUI for testing
bun run inspect:cli   # Run MCP Inspector CLI for testing
bun run test          # Run server tests (single run)
bun run test:watch    # Run server tests in watch mode
bun run test:run      # Run server tests (single run)
bun run format        # Format package files
bun run format:check  # Check package formatting
```

### Ingestion Package Commands (packages/pokemon-mcp-ingestion/)

```bash
bun run build         # Compile TypeScript
bun run dev           # Watch mode with bun --watch
bun run start         # Run ingestion
bun run ingest        # Run ingestion (alias)
bun run test          # Run ingestion tests (single run)
bun run test:watch    # Run ingestion tests in watch mode
bun run test:run      # Run ingestion tests (single run)
bun run format        # Format package files
bun run format:check  # Check package formatting
```

## Key Components

- **Database Schema**: SQLite with tables for pokemon, stats, types, abilities (via `bun:sqlite`)
- **MCP Tools**: `get_pokemon`, `search_pokemon`, `compare_pokemon`, `get_type_effectiveness`, `get_pokemon_stats`, `strongest_pokemon`
- **Data Flow**: PokeAPI → Ingestion service → SQLite → MCP Server → Client
- **TypeScript**: All packages use TypeScript; bun runs TS directly without a separate transpile step
- **Testing**: bun test (built-in test runner)
- **MCP Inspector**: Visual and CLI testing tool for debugging MCP server

The database is shared between packages at `../../data/pokemon.sqlite` relative to each package.

## Code Quality

- **oxfmt**: Automatic code formatting on commit via husky pre-commit hook
- **oxlint**: Linting on commit via husky pre-commit hook
- **Pre-commit hooks**: Format and lint code automatically before commits
- **TypeScript**: Strict typing across all packages with `bun-types` for bun built-ins
- **Conventional Commits**: All commits should follow conventional commit format

## Commit Guidelines

Use conventional commit format for all commits:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Common types:

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation changes
- `style`: formatting, no code change
- `refactor`: code change that neither fixes bug nor adds feature
- `test`: adding missing tests
- `chore`: maintenance tasks

Examples:

- `feat(server): add Pokemon evolution chain tool`
- `fix(ingestion): handle missing species URL gracefully`
- `docs: update Claude Desktop integration guide`

## Dependency Management

Dependencies are managed directly in each package's `package.json`. Workspaces are configured in the root `package.json` via the `workspaces` field.

## Claude Desktop Integration

### Option 1: Direct Bun Execution (Recommended)

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

### Option 2: Built Distribution

First build the package:

```bash
bun install
./scripts/setup-local-dev.sh
cd packages/pokemon-mcp-server
bun run build
```

Then configure Claude Desktop:

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

## Development Approach

- **Test-Driven Development (TDD)**:
  - Prefer the TDD approach, tests should be written first before any code changes
