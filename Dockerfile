# --- Stage 1: Build the UI ---
FROM node:22-slim AS ui-builder
RUN npm install -g pnpm
WORKDIR /app/ui
COPY ui/package.json ./
# If lockfile exists, copy it
COPY ui/pnpm-lock.yaml* ./ 
RUN pnpm install
COPY ui/ ./
RUN pnpm run build

# --- Stage 2: Build the Backend ---
FROM node:22-slim AS server-builder
RUN npm install -g pnpm
# Install tools for building better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# --- Stage 3: Production Image ---
FROM node:22-slim
WORKDIR /app
RUN npm install -g pnpm

# Install runtime dependencies for better-sqlite3 and screenshot-desktop
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libpng-dev \
    libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

# Production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy build artifacts
COPY --from=server-builder /app/dist ./dist
COPY --from=ui-builder /app/ui/dist ./ui/dist
COPY skills ./skills
COPY config.example.json ./config.example.json
# We'll expect config.json to be provided via volume, 
# but we copy it now just to have a working image out of the box
COPY config.json ./config.json

# Ensure memory directory exists
RUN mkdir -p memoryUser

# App port
EXPOSE 19666

# Start the application
CMD ["node", "dist/index.js"]
