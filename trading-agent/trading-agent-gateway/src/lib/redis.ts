import Redis from "ioredis";
import { config } from "../config";

/** Shared with the backend: same Upstash instance, blacklist + rate-limit keys. */
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
