# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

This is a PNPM monorepo for a Pokemon MCP (Model Context Protocol) system with two main packages:

- **pokemon-mcp-server**: MCP server that provides Pokemon data through standardized tools
- **pokemon-mcp-ingestion**: Data ingestion service that fetches from PokeAPI and stores in SQLite

The system uses a shared SQLite database (`data/pokemon.sqlite`) for Pokemon data storage. The MCP server exposes tools for getting individual Pokemon, searching by criteria, and finding strongest Pokemon by various stats.

## Commands

### Workspace Commands (run from root)

```bash
pnpm build         # Build all packages
pnpm dev           # Run all packages in development mode
pnpm test          # Run tests for all packages (single run)
pnpm test:watch    # Run tests in watch mode
pnpm test:run      # Run tests for all packages (single run)
pnpm lint          # Lint all packages
pnpm format        # Format all files with prettier
pnpm format:check  # Check formatting without modifying files
```

### Server Package Commands (packages/pokemon-mcp-server/)

```bash
pnpm build         # Compile TypeScript
pnpm dev           # Watch mode with tsx
pnpm start         # Run server directly
pnpm inspect       # Run MCP Inspector GUI for testing
pnpm inspect:cli   # Run MCP Inspector CLI for testing
pnpm test          # Run server tests (single run)
pnpm test:watch    # Run server tests in watch mode
pnpm test:run      # Run server tests (single run)
pnpm format        # Format package files
pnpm format:check  # Check package formatting
```

### Ingestion Package Commands (packages/pokemon-mcp-ingestion/)

```bash
pnpm build         # Compile TypeScript
pnpm dev           # Watch mode with tsx
pnpm start         # Run ingestion
pnpm ingest        # Run ingestion (alias)
pnpm test          # Run ingestion tests (single run)
pnpm test:watch    # Run ingestion tests in watch mode
pnpm test:run      # Run ingestion tests (single run)
pnpm format        # Format package files
pnpm format:check  # Check package formatting
```

## Key Components

- **Database Schema**: SQLite with tables for pokemon, stats, types, abilities
- **MCP Tools**: `get_pokemon`, `search_pokemon`, `get_strongest_pokemon`
- **Data Flow**: PokeAPI → Ingestion service → SQLite → MCP Server → Client
- **TypeScript**: All packages use TypeScript with tsx for development
- **Testing**: Vitest for unit and integration testing
- **MCP Inspector**: Visual and CLI testing tool for debugging MCP server

The database is shared between packages at `../../data/pokemon.sqlite` relative to each package.

## Code Quality

- **Prettier**: Automatic code formatting on commit via husky + lint-staged
- **Pre-commit hooks**: Format code automatically before commits
- **TypeScript**: Strict typing across all packages
- **PNPM Catalog**: Centralized dependency version management in `pnpm-workspace.yaml`
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

Dependencies are managed via PNPM catalog for version consistency:

- Common dependencies defined once in `pnpm-workspace.yaml` catalog
- Packages reference catalog versions with `"catalog:"` syntax
- Updates dependency versions in one place, applies across all packages
- Prevents version conflicts between packages

## Claude Desktop Integration

### Option 1: NPM Package (Recommended)

First, build and install the server globally:

```bash
# Ensure dependencies are installed and database is populated
pnpm install
./scripts/setup-local-dev.sh

# Build and install the server package
cd packages/pokemon-mcp-server
pnpm build
npm link
```

Configure Claude Desktop with the global package:

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

If you prefer not to install globally:

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

For active development with hot reload:

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

## Development Approach

- **Test-Driven Development (TDD)**:
  - Prefer the TDD approach, tests should be written first before any code changes
