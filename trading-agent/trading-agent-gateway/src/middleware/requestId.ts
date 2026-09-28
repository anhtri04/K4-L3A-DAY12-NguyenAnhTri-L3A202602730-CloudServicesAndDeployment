import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = (req.headers["x-request-id"] as string) || randomUUID();
  req.requestId = id;
  // Stamp the incoming header so the proxy forwards it to the backend.
  req.headers["x-request-id"] = id;
  // Never let clients spoof downstream identity headers.
  delete req.headers["x-user-id"];
  res.setHeader("x-request-id", id);
  next();
};
