# Multi-stage Dockerfile for SightAI Miner
# Combines backend NestJS application and CLI tool

ARG NODE_VERSION=20.9.0
FROM node:${NODE_VERSION}-bullseye-slim AS base

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        openssh-client \
        build-essential \
        make \
        gcc \
        python3 \
        python3-pip \
        python3-setuptools \
        python3-wheel \
        git && \
    rm -rf /var/lib/apt/lists/*

# Enable corepack for yarn and npm
RUN corepack enable && corepack prepare yarn@stable --activate

# Stage 1: Build CLI
FROM base AS cli-builder
WORKDIR /build/cli

# Copy CLI package files
COPY cli/package*.json ./
COPY cli/bin ./bin
COPY cli/lib ./lib

# Install CLI dependencies
RUN npm install --production

# Stage 2: Final runtime image
FROM node:${NODE_VERSION}-bullseye-slim AS runtime

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gnupg && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Create non-root user with home directory
RUN groupadd -r sightai && useradd -r -g sightai -m sightai

# Copy pre-built backend and dependency files
COPY backend/dist ./backend/dist
COPY backend/package.json ./backend/package.json
COPY backend/yarn.lock ./backend/yarn.lock
COPY backend/nx.json ./backend/nx.json
COPY backend/tsconfig.base.json ./backend/tsconfig.base.json

# Install backend dependencies in production mode
WORKDIR /app/backend
RUN npm install --production --no-optional --ignore-scripts

# Return to app directory
WORKDIR /app

# Copy CLI
COPY --from=cli-builder /build/cli ./cli

# Create symlink for sight-cli command
RUN ln -s /app/cli/bin/index.js /usr/local/bin/sight-cli && \
    chmod +x /app/cli/bin/index.js

# Create .sightai directory structure in user home
RUN mkdir -p /home/sightai/.sightai/{logs,config,data} && \
    chown -R sightai:sightai /home/sightai/.sightai

# Set ownership of app directory
RUN chown -R sightai:sightai /app

# Switch to non-root user
USER sightai

# Create volume for persistent data
VOLUME ["/home/sightai/.sightai"]

# Expose backend port
EXPOSE 8716

# Set environment variables
ENV NODE_ENV=production
ENV API_PORT=8716
ENV DOCKER_CONTAINER=true
ENV OLLAMA_API_URL=http://host.docker.internal:11434

# Default command runs the CLI
CMD ["node", "/app/backend/dist/packages/apps/api-server/main.js"]
