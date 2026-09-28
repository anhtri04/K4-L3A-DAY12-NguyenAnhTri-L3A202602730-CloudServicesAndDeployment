import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodTypeAny } from "zod";
import { badRequest } from "./errors";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps async route handlers so rejected promises reach the error middleware. */
export const asyncHandler =
  (handler: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    handler(req, res, next).catch(next);
  };

/** Parse a request body with zod, throwing a 400 on failure. */
export const parseBody = <T extends ZodTypeAny>(schema: T, body: unknown): ReturnType<T["parse"]> => {
  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues[0];
    throw badRequest(first ? `${first.path.join(".")}: ${first.message}` : "Invalid body");
  }
  return result.data;
};
