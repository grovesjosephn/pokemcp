FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@10.8.0

# Set working directory
WORKDIR /app

# Copy package files for dependency resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/pokemon-mcp-server/package.json ./packages/pokemon-mcp-server/
COPY packages/pokemon-mcp-ingestion/package.json ./packages/pokemon-mcp-ingestion/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy server source
COPY packages/pokemon-mcp-server ./packages/pokemon-mcp-server/

# Build server
RUN cd packages/pokemon-mcp-server && pnpm build

# Create data directory
RUN mkdir -p /app/data

# Set working directory to server package
WORKDIR /app/packages/pokemon-mcp-server

# Expose port (though MCP typically uses stdio)
EXPOSE 3000

# Default command
CMD ["pnpm", "start"]