#!/bin/bash

# Redirect build output to stderr so it doesn't interfere with MCP protocol
docker build -f packages/pokemon-mcp-server/Dockerfile -t pokemon-server . >&2

# Run the container with stdio passthrough for MCP protocol
exec docker run --rm -i \
  -v pokemon_data:/app/data \
  pokemon-server