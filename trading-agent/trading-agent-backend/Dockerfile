# Build context is the `trading-agent/` root (see infra docker-compose.yml)
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl

# 1) Build the shared (types-only) contracts package
COPY trading-agent-contracts/package.json trading-agent-contracts/
COPY trading-agent-contracts/tsconfig.json trading-agent-contracts/
COPY trading-agent-contracts/src trading-agent-contracts/src
RUN cd trading-agent-contracts && npm install && npm run build

# 2) Build the backend
COPY trading-agent-backend/package.json trading-agent-backend/
WORKDIR /app/trading-agent-backend
RUN npm install
COPY trading-agent-backend/ ./
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /app/trading-agent-contracts ./trading-agent-contracts
COPY --from=build /app/trading-agent-backend/node_modules ./node_modules
COPY --from=build /app/trading-agent-backend/dist ./dist
COPY --from=build /app/trading-agent-backend/prisma ./prisma
COPY --from=build /app/trading-agent-backend/package.json ./package.json
EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
