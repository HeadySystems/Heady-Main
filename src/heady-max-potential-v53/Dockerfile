# Heady™ Latent OS — Root Dockerfile (monorepo builder)
# © 2026 HeadySystems Inc. — Eric Haywood — 51 Provisional Patents
#
# Usage: docker build --build-arg SERVICE=auth-session -t heady-auth .

ARG SERVICE=api-gateway

FROM node:20-slim AS base
WORKDIR /app

# Copy shared dependencies first (layer caching)
COPY package.json ./
COPY shared/ ./shared/
COPY src/ ./src/

# Copy target service
COPY services/${SERVICE}/ ./services/${SERVICE}/

# Install service dependencies
WORKDIR /app/services/${SERVICE}
RUN npm ci --production 2>/dev/null || true

# Production stage
FROM gcr.io/distroless/nodejs20-debian12
COPY --from=base /app /app
ARG SERVICE=api-gateway
WORKDIR /app/services/${SERVICE}
ENV NODE_ENV=production
CMD ["index.js"]
