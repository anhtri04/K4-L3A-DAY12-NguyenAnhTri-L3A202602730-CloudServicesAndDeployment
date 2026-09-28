# Build context is the `trading-agent/` root (see infra docker-compose.yml)
FROM node:20-alpine AS build
WORKDIR /app

COPY trading-agent-contracts/package.json trading-agent-contracts/
COPY trading-agent-contracts/tsconfig.json trading-agent-contracts/
COPY trading-agent-contracts/src trading-agent-contracts/src
RUN cd trading-agent-contracts && npm install && npm run build

COPY trading-agent-gateway/package.json trading-agent-gateway/
WORKDIR /app/trading-agent-gateway
RUN npm install
COPY trading-agent-gateway/ ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/trading-agent-contracts ./trading-agent-contracts
COPY --from=build /app/trading-agent-gateway/node_modules ./node_modules
COPY --from=build /app/trading-agent-gateway/dist ./dist
COPY --from=build /app/trading-agent-gateway/package.json ./package.json
EXPOSE 8080
CMD ["node", "dist/index.js"]
