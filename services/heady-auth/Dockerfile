# ═══════════════════════════════════════════════════════════════
# HEADY AUTH SERVICE — Cloud Run Dockerfile
# ∞ Sacred Geometry :: Auth Service :: Production ∞
# ═══════════════════════════════════════════════════════════════

FROM node:20-slim AS base

# Set production
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Install deps first (Docker cache layer)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || npm install --omit=dev --ignore-scripts

# Copy application code
COPY server.mjs ./
COPY public/ ./public/

# Cloud Run expects PORT env var
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# Non-root user for security
RUN addgroup --system heady && adduser --system --ingroup heady heady
USER heady

CMD ["node", "server.mjs"]
