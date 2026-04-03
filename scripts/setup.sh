#!/bin/bash

set -e

echo "🚀 Setting up Pokemon MCP development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build packages
echo "🔨 Building packages..."
bun run build

# Run ingestion to populate database
echo "📊 Populating Pokemon database..."
cd packages/pokemon-mcp-ingestion
bun run start
cd ../..

# Install server globally for Claude Desktop integration
echo "🔗 Installing server globally..."
cd packages/pokemon-mcp-server
npm link
cd ../..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add to Claude Desktop config:"
echo '   {'
echo '     "mcpServers": {'
echo '       "pokemon": {'
echo '         "command": "pokemon-mcp-server",'
echo '         "env": {'
echo '           "POKEMON_DATA_DIR": "'$(pwd)'/data"'
echo '         }'
echo '       }'
echo '     }'
echo '   }'
echo ""
echo "2. For development: bun run dev"
echo "3. To test server: cd packages/pokemon-mcp-server && bun run inspect"