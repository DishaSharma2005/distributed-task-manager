# ─── Stage 1: Build dependencies ────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Install only production dependencies
RUN npm ci --omit=dev

# ─── Stage 2: Production image ───────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/
COPY public/ ./public/
COPY package*.json ./

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Expose the application port (overridden by PORT env var)
EXPOSE 3000

# Health check: ALB also uses /health, this helps Docker know container is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
