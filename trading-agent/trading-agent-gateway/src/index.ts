import { createApp } from "./app";
import { config } from "./config";
import { redis, redisHealthy } from "./lib/redis";

const app = createApp();

const server = app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[gateway] listening on :${config.PORT} -> ${config.BACKEND_URL}`);
  // eslint-disable-next-line no-console
  console.log(`[gateway] allowed origins: ${config.ALLOWED_ORIGINS.join(", ") || "(none)"}`);
});

void redisHealthy().then((ok) => {
  // eslint-disable-next-line no-console
  console.log(`[gateway] redis ${ok ? "connected" : "UNAVAILABLE"}`);
});

const shutdown = (signal: string): void => {
  // eslint-disable-next-line no-console
  console.log(`[gateway] ${signal} received, shutting down`);
  server.close();
  redis.disconnect();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
