import { createApp } from "./app";
import { config } from "./config";
import { prisma } from "./lib/prisma";
import { redis, redisHealthy } from "./lib/redis";

const app = createApp();

const server = app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on :${config.PORT} (${config.NODE_ENV})`);
});

void redisHealthy().then((ok) => {
  // eslint-disable-next-line no-console
  console.log(`[backend] redis ${ok ? "connected" : "UNAVAILABLE"}`);
});

const shutdown = async (signal: string): Promise<void> => {
  // eslint-disable-next-line no-console
  console.log(`[backend] ${signal} received, shutting down`);
  server.close();
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
