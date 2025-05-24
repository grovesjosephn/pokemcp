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
pnpm test          # Run tests for all packages with vitest
pnpm lint          # Lint all packages
pnpm format        # Format all files with prettier
pnpm format:check  # Check formatting without modifying files
```

### Server Package Commands (packages/pokemon-mcp-server/)

```bash
pnpm build         # Compile TypeScript
pnpm dev           # Watch mode with tsx
pnpm start         # Run server directly
pnpm test          # Run server tests with vitest
pnpm format        # Format package files
pnpm format:check  # Check package formatting
```

### Ingestion Package Commands (packages/pokemon-mcp-ingestion/)

```bash
pnpm build         # Compile TypeScript
pnpm dev           # Watch mode with tsx
pnpm start         # Run ingestion
pnpm ingest        # Run ingestion (alias)
pnpm test          # Run ingestion tests with vitest
pnpm format        # Format package files
pnpm format:check  # Check package formatting
```

## Key Components

- **Database Schema**: SQLite with tables for pokemon, stats, types, abilities
- **MCP Tools**: `get_pokemon`, `search_pokemon`, `get_strongest_pokemon`
- **Data Flow**: PokeAPI → Ingestion service → SQLite → MCP Server → Client
- **TypeScript**: All packages use TypeScript with tsx for development
- **Testing**: Vitest for unit and integration testing

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

## Docker Containerization

Each package can be run individually in Docker containers:

### Individual Container Commands

```bash
# Build and run ingestion service
docker build -f packages/pokemon-mcp-ingestion/Dockerfile -t pokemon-ingestion .
docker run --rm -v pokemon_data:/app/data pokemon-ingestion

# Build and run server
docker build -f packages/pokemon-mcp-server/Dockerfile -t pokemon-server .
docker run --rm -v pokemon_data:/app/data -it pokemon-server
```

### Docker Compose Commands

```bash
# Run ingestion to populate database
docker-compose --profile ingestion up

# Run server only
docker-compose --profile server up

# Development mode with hot reload
docker-compose --profile dev up

# Run both services
docker-compose --profile ingestion --profile server up
```

### Key Features

- **Isolated execution**: Each service runs in its own container
- **Shared data volume**: SQLite database persisted in `pokemon_data` volume
- **Development support**: Hot reload with volume mounting
- **Profile-based deployment**: Choose which services to run

## Claude Desktop Integration

### Option 1: Container with Wrapper Script

```json
{
  "mcpServers": {
    "pokemon": {
      "command": "/path/to/pokemcp/scripts/run-server.sh"
    }
  }
}
```

### Option 2: Local Development (Recommended)

```bash
# Run ingestion in container first
./scripts/setup-local-dev.sh

# Then configure Claude Desktop for local server
{
  "mcpServers": {
    "pokemon": {
      "command": "tsx",
      "args": ["server.ts"],
      "cwd": "/path/to/pokemcp/packages/pokemon-mcp-server"
    }
  }
}
```
