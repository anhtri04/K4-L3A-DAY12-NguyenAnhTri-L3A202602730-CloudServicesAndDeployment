import type { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { redis } from "../lib/redis";
import { HttpError, rateLimited } from "../lib/errors";

interface RateLimitOptions {
  prefix: string;
  max: number;
  windowMs?: number;
  key: (req: Request) => string;
}

const clientIp = (req: Request): string => req.ip ?? req.socket.remoteAddress ?? "unknown";

/**
 * Fixed-window counter in Redis. Intentionally simple for the MVP.
 * Fails open if Redis is unreachable so a cache outage cannot take down the API.
 */
export const rateLimit = (options: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const windowMs = options.windowMs ?? config.RATE_LIMIT_WINDOW_MS;
    try {
      const bucket = Math.floor(Date.now() / windowMs);
      const key = `rl:${options.prefix}:${options.key(req)}:${bucket}`;

      const count = await redis.incr(key);
      if (count === 1) await redis.pexpire(key, windowMs);

      res.setHeader("X-RateLimit-Limit", String(options.max));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, options.max - count)));

      if (count > options.max) {
        res.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
        throw rateLimited();
      }
      next();
    } catch (error) {
      if (error instanceof HttpError) {
        next(error);
        return;
      }
      // eslint-disable-next-line no-console
      console.error("[gateway] rate limiter unavailable, failing open", error);
      next();
    }
  };
};

export const globalLimiter = rateLimit({
  prefix: "global",
  max: config.RATE_LIMIT_GLOBAL_MAX,
  key: clientIp,
});

export const authLimiter = rateLimit({
  prefix: "auth",
  max: config.RATE_LIMIT_AUTH_MAX,
  key: clientIp,
});

export const chatLimiter = rateLimit({
  prefix: "chat",
  max: config.RATE_LIMIT_CHAT_MAX,
  key: (req) => req.user?.sub ?? clientIp(req),
});
