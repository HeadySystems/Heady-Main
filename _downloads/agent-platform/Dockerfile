FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy source
COPY src/ ./src/
COPY config/ ./config/

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3301/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 3301

CMD ["node", "src/services/heady-manager.js"]
