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
pnpm test          # Run tests for all packages
pnpm lint          # Lint all packages
pnpm format        # Format all files with prettier
pnpm format:check  # Check formatting without modifying files
```

### Server Package Commands (packages/pokemon-mcp-server/)

```bash
pnpm build         # Compile TypeScript
pnpm dev           # Watch mode with tsx
pnpm start         # Run server directly
pnpm test          # Run server tests
pnpm format        # Format package files
pnpm format:check  # Check package formatting
```

### Ingestion Package Commands (packages/pokemon-mcp-ingestion/)

```bash
pnpm build         # Compile TypeScript
pnpm dev           # Watch mode with tsx
pnpm start         # Run ingestion
pnpm ingest        # Run ingestion (alias)
pnpm test          # Test database queries
pnpm format        # Format package files
pnpm format:check  # Check package formatting
```

## Key Components

- **Database Schema**: SQLite with tables for pokemon, stats, types, abilities
- **MCP Tools**: `get_pokemon`, `search_pokemon`, `get_strongest_pokemon`
- **Data Flow**: PokeAPI → Ingestion service → SQLite → MCP Server → Client
- **TypeScript**: All packages use TypeScript with tsx for development

The database is shared between packages at `../../data/pokemon.sqlite` relative to each package.

## Code Quality

- **Prettier**: Automatic code formatting on commit via husky + lint-staged
- **Pre-commit hooks**: Format code automatically before commits
- **TypeScript**: Strict typing across all packages
- **PNPM Catalog**: Centralized dependency version management in `pnpm-workspace.yaml`

## Dependency Management

Dependencies are managed via PNPM catalog for version consistency:

- Common dependencies defined once in `pnpm-workspace.yaml` catalog
- Packages reference catalog versions with `"catalog:"` syntax
- Updates dependency versions in one place, applies across all packages
- Prevents version conflicts between packages
