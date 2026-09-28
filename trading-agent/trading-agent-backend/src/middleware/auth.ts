import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { unauthorized } from "../lib/errors";

/**
 * Defense-in-depth: the gateway already authenticates, but the backend
 * verifies the access token again so it is never independently exposed.
 */
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    next(unauthorized("Missing bearer token"));
    return;
  }
  try {
    req.user = verifyAccessToken(header.slice("Bearer ".length));
    next();
  } catch (error) {
    next(error);
  }
};
