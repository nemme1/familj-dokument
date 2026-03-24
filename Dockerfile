# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build tools needed for native modules
RUN apk add --no-cache python3 make g++ build-base

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (build native modules such as better-sqlite3)
RUN npm ci

# Copy source
COPY . .

# Build frontend and backend
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy built output and node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "dist/index.cjs"]
