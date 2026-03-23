FROM node:20-slim AS base
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || npm install --omit=dev --ignore-scripts
COPY server.mjs ./
COPY public/ ./public/
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
RUN addgroup --system heady && adduser --system --ingroup heady heady
USER heady
CMD ["node", "server.mjs"]
