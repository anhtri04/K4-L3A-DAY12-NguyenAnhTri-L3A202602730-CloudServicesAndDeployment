import type { NextFunction, Request, Response } from "express";
import { isAccessTokenBlacklisted } from "../lib/blacklist";
import { unauthorized } from "../lib/errors";
import { verifyAccessToken } from "../lib/jwt";

/**
 * Verifies the access token signature/expiry and rejects tokens whose `jti`
 * was blacklisted on logout.
 */
export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw unauthorized("Missing bearer token");
    }

    const payload = verifyAccessToken(header.slice("Bearer ".length));
    if (await isAccessTokenBlacklisted(payload.jti)) {
      throw unauthorized("Token has been revoked");
    }

    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
};
