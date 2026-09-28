import { redis } from "./redis";

const blacklistKey = (jti: string) => `bl:${jti}`;

/** Mirrors the key scheme written by the backend on logout. */
export const isAccessTokenBlacklisted = async (jti: string): Promise<boolean> =>
  (await redis.exists(blacklistKey(jti))) === 1;
