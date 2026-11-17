FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build && npm run build:server && npm prune --omit=dev \
    && mkdir /runtime && mv node_modules package.json build-server dist /runtime/ \
    && npm cache clean --force

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /runtime/ ./
USER node
EXPOSE 3001
CMD ["node", "build-server/server/production.js"]
