import type { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { forbidden } from "../lib/errors";

/**
 * Browser-origin allowlist. Blocks cross-site callers that try to reuse a
 * token stolen from local storage. Non-browser clients (no Origin) are
 * governed by ALLOW_MISSING_ORIGIN.
 */
export const originCheck = (req: Request, _res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;

  if (!origin) {
    if (config.ALLOW_MISSING_ORIGIN) {
      next();
      return;
    }
    next(forbidden("Origin header required"));
    return;
  }

  if (config.ALLOWED_ORIGINS.includes(origin)) {
    next();
    return;
  }

  next(forbidden("Origin not allowed"));
};
