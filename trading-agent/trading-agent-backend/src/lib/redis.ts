import Redis from "ioredis";
import { config } from "../config";

/**
 * Upstash speaks the standard Redis protocol over TLS (rediss://).
 * `maxRetriesPerRequest` keeps requests from hanging forever if Redis is down.
 */
export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 2,
  enableReadyCheck: true,
  lazyConnect: false,
});

export const redisHealthy = async (): Promise<boolean> => {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
};
