FROM node:20-slim
WORKDIR /app
COPY shared/ ./shared/
COPY services/notification/package*.json ./services/notification/
RUN cd services/notification && npm ci --production
COPY services/notification/ ./services/notification/
COPY src/ ./src/
ENV NODE_ENV=production SERVICE_NAME=notification SERVICE_PORT=3361
RUN groupadd -r heady && useradd -r -g heady heady && chown -R heady:heady /app
USER heady
EXPOSE 3361
CMD ["node", "services/notification/index.js"]
