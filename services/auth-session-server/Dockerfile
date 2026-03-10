FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

FROM node:20-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

COPY --chown=nodejs:nodejs package*.json ./

COPY --chown=nodejs:nodejs src ./src

USER nodejs

EXPOSE 3395

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3395/_heady/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]
