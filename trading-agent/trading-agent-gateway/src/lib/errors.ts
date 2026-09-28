import type { ErrorCode } from "@trading-agent/contracts";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const forbidden = (message = "Forbidden") => new HttpError(403, "FORBIDDEN", message);
export const unauthorized = (message = "Unauthorized") =>
  new HttpError(401, "UNAUTHORIZED", message);
export const rateLimited = (message = "Too many requests") =>
  new HttpError(429, "RATE_LIMITED", message);
export const badRequest = (message = "Bad request") => new HttpError(400, "BAD_REQUEST", message);
