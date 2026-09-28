import { createHash } from "node:crypto";
import { config } from "../config";
import { redis } from "./redis";

const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const refreshKey = (userId: string, jti: string) => `rt:${userId}:${jti}`;
const blacklistKey = (jti: string) => `bl:${jti}`;

/** Persist a hashed refresh token so it can be rotated or revoked. */
export const storeRefreshToken = async (
  userId: string,
  jti: string,
  token: string,
): Promise<void> => {
  await redis.set(refreshKey(userId, jti), sha256(token), "EX", config.REFRESH_TOKEN_TTL);
};

/**
 * Validate and consume (rotate) a refresh token.
 * Returns true when the token was known and just got revoked.
 */
export const consumeRefreshToken = async (
  userId: string,
  jti: string,
  token: string,
): Promise<boolean> => {
  const key = refreshKey(userId, jti);
  const stored = await redis.get(key);
  if (!stored || stored !== sha256(token)) return false;
  await redis.del(key);
  return true;
};

/** Used on logout / reuse detection. */
export const revokeAllRefreshTokens = async (userId: string): Promise<void> => {
  const stream = redis.scanStream({ match: `rt:${userId}:*`, count: 100 });
  const keys: string[] = [];
  for await (const batch of stream) {
    keys.push(...(batch as string[]));
  }
  if (keys.length > 0) await redis.del(...keys);
};

/** Add an access token id to the blacklist for its remaining lifetime. */
export const blacklistAccessToken = async (
  jti: string,
  ttlSeconds: number,
): Promise<void> => {
  if (ttlSeconds <= 0) return;
  await redis.set(blacklistKey(jti), "1", "EX", ttlSeconds);
};

export const isAccessTokenBlacklisted = async (jti: string): Promise<boolean> => {
  return (await redis.exists(blacklistKey(jti))) === 1;
};
