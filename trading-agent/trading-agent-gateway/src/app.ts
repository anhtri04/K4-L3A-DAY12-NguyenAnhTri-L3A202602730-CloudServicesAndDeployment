import express from "express";
import { authLimiter, chatLimiter, globalLimiter } from "./middleware/rateLimit";
import { cors } from "./middleware/cors";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { originCheck } from "./middleware/origin";
import { requireAuth } from "./middleware/auth";
import { requestId } from "./middleware/requestId";
import { proxy } from "./proxy";

export const createApp = () => {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  // Unauthenticated, un-proxied health probe for the tunnel/orchestrator.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "gateway" });
  });

  app.use(requestId);
  app.use(originCheck);
  app.use(cors);
  app.use(globalLimiter);

  // Public auth endpoints: aggressive brute-force limit.
  app.use(["/signup", "/login", "/refresh"], authLimiter);

  // Protected endpoints: valid, non-revoked access token required.
  app.use(["/logout", "/chat", "/chatsession", "/history"], requireAuth);

  // Per-user limit on the expensive agent endpoint.
  app.use("/chat", chatLimiter);

  // Everything else is forwarded to the backend.
  app.use(proxy);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
