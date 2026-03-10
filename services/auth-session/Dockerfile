FROM node:20-slim
WORKDIR /app
COPY shared/ ./shared/
COPY services/auth-session/package*.json ./services/auth-session/
RUN cd services/auth-session && npm ci --production
COPY services/auth-session/ ./services/auth-session/
COPY src/ ./src/
ENV NODE_ENV=production SERVICE_NAME=auth-session SERVICE_PORT=3360
RUN groupadd -r heady && useradd -r -g heady heady && chown -R heady:heady /app
USER heady
EXPOSE 3360
CMD ["node", "services/auth-session/index.js"]
