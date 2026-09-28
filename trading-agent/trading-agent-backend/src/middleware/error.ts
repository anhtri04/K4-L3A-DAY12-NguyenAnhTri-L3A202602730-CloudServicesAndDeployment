import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import type { ApiError } from "@trading-agent/contracts";

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = (req.headers["x-request-id"] as string) || randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  const body: ApiError = {
    error: { code: "NOT_FOUND", message: "Route not found" },
  };
  res.status(404).json(body);
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status: number }).status)
      : 500;
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: string }).code)
      : "INTERNAL";
  const message = error instanceof Error ? error.message : "Internal server error";

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(`[backend] ${req.requestId ?? "-"} ${message}`, error);
  }

  const body: ApiError = {
    error: {
      code: code as ApiError["error"]["code"],
      message: status >= 500 ? "Internal server error" : message,
      requestId: req.requestId,
    },
  };
  res.status(status).json(body);
};
