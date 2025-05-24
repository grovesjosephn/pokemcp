#!/bin/bash

echo "Setting up local development with containerized ingestion..."

# Run ingestion in container to populate database
echo "Running data ingestion..."
docker-compose --profile ingestion up --abort-on-container-exit

echo "Ingestion complete. You can now run the server locally:"
echo "cd packages/pokemon-mcp-server && pnpm start"