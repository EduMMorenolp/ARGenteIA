# --- Stage 1: Build the UI ---
FROM node:22-slim AS ui-builder
RUN npm install -g pnpm
WORKDIR /app/ui
COPY ui/package.json ./
RUN pnpm install --no-frozen-lockfile
COPY ui/ ./
RUN pnpm run build

# --- Stage 2: Build the Backend ---
FROM node:22-slim AS server-builder
# Install tools for building native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
# Using npm here to avoid pnpm's virtual store paths in the bundle
RUN npm install
COPY . .
# Bundle backend
RUN npx esbuild src/index.ts --bundle --platform=node --target=node22 --outfile=dist/index.js --external:better-sqlite3 --external:screenshot-desktop --format=esm --banner:js="import { createRequire as _createRequire } from 'module'; const require = _createRequire(import.meta.url); import { fileURLToPath as _fileURLToPath } from 'url'; import { dirname as _dirname_banner } from 'path'; const __filename = _fileURLToPath(import.meta.url); const __dirname = _dirname_banner(__filename);"

# --- Stage 3: Production Image ---
FROM node:22-slim
WORKDIR /app

# Install runtime dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libpng-dev \
    libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

# Production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# Copy build artifacts
COPY --from=server-builder /app/dist ./dist
COPY --from=ui-builder /app/ui/dist ./ui/dist
COPY skills ./skills
COPY config.example.json ./config.example.json
COPY config.json* ./config.json

# Ensure memory directory exists
RUN mkdir -p memoryUser

# App port
EXPOSE 19666

# Start the application
CMD ["node", "dist/index.js"]
