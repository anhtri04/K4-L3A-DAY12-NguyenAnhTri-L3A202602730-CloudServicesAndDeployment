import type { AccessTokenPayload } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      requestId?: string;
    }
  }
}

export {};
