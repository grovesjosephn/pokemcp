#!/bin/bash

# Ensure the container is built
docker build -f packages/pokemon-mcp-server/Dockerfile -t pokemon-server .

# Run the container with stdio passthrough
docker run --rm -i \
  -v pokemon_data:/app/data \
  pokemon-server