import type { NextFunction, Request, Response } from "express";

/**
 * Runs after `originCheck`, so echoing the request origin is safe.
 * Bearer tokens (not cookies) are used, so credentials are not enabled.
 */
export const cors = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization,Content-Type,X-Request-Id",
  );
  res.setHeader("Access-Control-Max-Age", "600");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
};
