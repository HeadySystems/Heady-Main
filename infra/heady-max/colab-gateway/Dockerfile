FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

FROM node:20-alpine
RUN addgroup -g 1001 heady && adduser -u 1001 -G heady -s /bin/sh -D heady
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER heady
EXPOSE 3360
HEALTHCHECK --interval=8s --timeout=5s --retries=5 --start-period=13s \
  CMD wget -qO- http://localhost:3360/health || exit 1
CMD ["node", "dist/index.js"]
